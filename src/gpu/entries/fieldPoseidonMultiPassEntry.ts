import { FieldModulusWGSL } from "../FieldModulus";
import { PoseidonFirstHashOutputWGSL, PoseidonRoundFullWGSL, PoseidonRoundPartialWGSL } from "../FieldPoseidon";
import { PoseidonConstantsWGSL } from "../PoseidonConstants";
import { FieldAddWGSL } from "../FieldAdd";
import { workgroupSize } from "../params";

export const field_poseidon_multi = async (input1: Array<number>, input2: Array<number>, input3: Array<number>) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const gpu = (await getDevice())!;
  const baseModules = [PoseidonConstantsWGSL, FieldModulusWGSL, FieldAddWGSL];
  const numInputs = input1.length / 8;
  const nonArryBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;
  const arrayBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 9; // Because 9 fields per array

  const firstHashEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: u256s;
    @group(0) @binding(1)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_first_hash_output(input1.u256s[global_id.x]);
      output[global_id.x] = result;
    }
  `;

  const fullRoundEntry = (roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read> aleoRoundConstants: array<array<u256, 9>, 39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<Field, 9>>;

     @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_full(input1[global_id.x], ${roundOffset}u);
      output[global_id.x] = result;
    }
  `;

  const partialRoundEntry = (roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_partial(input1[global_id.x], ${roundOffset}u);
      output[global_id.x] = result;
    }
  `;

  const finalEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<u256>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = input1[global_id.x][1];
      output[global_id.x] = result;
    }
  `;

  // First hash boilerplate
  const firstHashShaderCode = [...baseModules, PoseidonFirstHashOutputWGSL, firstHashEntry];
  const firstHashShaderModule = createGpuShaderModule(gpu, firstHashShaderCode);
  const firstHashInput = new Uint32Array(input1);
  const firstHashInputGpuBuffer = [createU32ArrayInputBuffer(gpu, firstHashInput)];
  const firstHashResultBuffer = gpu.createBuffer({
    size: arrayBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const firstHashBindGroupLayout = createBindGroupLayout(gpu, firstHashInputGpuBuffer, ["read-only-storage"]);
  const firstHashBindGroup = createBindGroup(gpu, firstHashBindGroupLayout, firstHashInputGpuBuffer, firstHashResultBuffer);
  const firstHashPipeline = gpu.createComputePipeline({
    layout: gpu.createPipelineLayout({bindGroupLayouts: [firstHashBindGroupLayout]}),
    compute: { 
      module: firstHashShaderModule,
      entryPoint: "main"
    }
  });

  const roundInputs = [input2, input3].map((input) => new Uint32Array(input));

  const fullRoundShaderCodes = [
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(0)],
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(1)],
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(2)],
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(3)]
  ];
  const fullRoundShaderModules = fullRoundShaderCodes.map(c => createGpuShaderModule(gpu, c));
  const fullRoundInputBuffers: GPUBuffer[][] = [];
  const fullRoundResultBuffers: GPUBuffer[] = [];
  const fullRoundBindGroups: GPUBindGroup[] = [];
  const fullRoundPipelines: GPUComputePipeline[] = [];
  for (let i = 0; i < fullRoundShaderCodes.length; i++) {
    const inputBuffer = gpu.createBuffer({
      size: arrayBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    const constantsBuffers = roundInputs.map((input) => createU32ArrayInputBuffer(gpu, input));
    const inputBuffers = [inputBuffer, ...constantsBuffers];
    const resultBuffer = gpu.createBuffer({
      size: arrayBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const bindGroupLayout = createBindGroupLayout(gpu, inputBuffers, ["storage", "read-only-storage", "read-only-storage"]);
    const bindGroup = createBindGroup(gpu, bindGroupLayout, inputBuffers, resultBuffer);
    const pipeline = gpu.createComputePipeline({
      layout: gpu.createPipelineLayout({bindGroupLayouts: [bindGroupLayout]}),
      compute: {
        module: fullRoundShaderModules[i],
        entryPoint : "main"
      }
    });
    fullRoundInputBuffers.push(inputBuffers);
    fullRoundResultBuffers.push(resultBuffer);
    fullRoundBindGroups.push(bindGroup);
    fullRoundPipelines.push(pipeline);
  }




  const partialRoundShaderCodes: string[][] = []
  for (let i = 0; i < 31; i++) {
    partialRoundShaderCodes.push([...baseModules, PoseidonRoundPartialWGSL, partialRoundEntry(i + 4)]);
  }
  const partialRoundShaderModules = partialRoundShaderCodes.map(c => createGpuShaderModule(gpu, c));
  const partialRoundInputBuffers: GPUBuffer[][] = [];
  const partialRoundResultBuffers: GPUBuffer[] = [];
  const partialRoundBindGroups: GPUBindGroup[] = [];
  const partialRoundPipelines: GPUComputePipeline[] = [];
  for (let i = 0; i < partialRoundShaderModules.length; i++) {
    const inputBuffer = gpu.createBuffer({
      size: arrayBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    const constantsBuffers = roundInputs.map((input) => createU32ArrayInputBuffer(gpu, input));
    const inputBuffers = [inputBuffer, ...constantsBuffers];
    const resultBuffer = gpu.createBuffer({
      size: arrayBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const bindGroupLayout = createBindGroupLayout(gpu, inputBuffers, ["storage", "read-only-storage", "read-only-storage"]);
    const bindGroup = createBindGroup(gpu, bindGroupLayout, inputBuffers, resultBuffer);
    const pipeline = gpu.createComputePipeline({
      layout: gpu.createPipelineLayout({bindGroupLayouts: [bindGroupLayout]}),
      compute: {
        module: partialRoundShaderModules[i],
        entryPoint : "main"
      }
    });
    partialRoundInputBuffers.push(inputBuffers);
    partialRoundResultBuffers.push(resultBuffer);
    partialRoundBindGroups.push(bindGroup);
    partialRoundPipelines.push(pipeline);
  }




  const lastFullRoundShaderCodes = [
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(35)],
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(36)],
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(37)],
    [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(38)]
  ];
  const lastFullRoundShaderModules = lastFullRoundShaderCodes.map(c => createGpuShaderModule(gpu, c));
  const lastFullRoundInputBuffers: GPUBuffer[][] = [];
  const lastFullRoundResultBuffers: GPUBuffer[] = [];
  const lastFullRoundBindGroups: GPUBindGroup[] = [];
  const lastFullRoundPipelines: GPUComputePipeline[] = [];
  for (let i = 0; i < lastFullRoundShaderCodes.length; i++) {
    const inputBuffer = gpu.createBuffer({
      size: arrayBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    const constantsBuffers = roundInputs.map((input) => createU32ArrayInputBuffer(gpu, input));
    const inputBuffers = [inputBuffer, ...constantsBuffers];
    const resultBuffer = gpu.createBuffer({
      size: arrayBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const bindGroupLayout = createBindGroupLayout(gpu, inputBuffers, ["storage", "read-only-storage", "read-only-storage"]);
    const bindGroup = createBindGroup(gpu, bindGroupLayout, inputBuffers, resultBuffer);
    const pipeline = gpu.createComputePipeline({
      layout: gpu.createPipelineLayout({bindGroupLayouts: [bindGroupLayout]}),
      compute: {
        module: lastFullRoundShaderModules[i],
        entryPoint : "main"
      }
    });
    lastFullRoundInputBuffers.push(inputBuffers);
    lastFullRoundResultBuffers.push(resultBuffer);
    lastFullRoundBindGroups.push(bindGroup);
    lastFullRoundPipelines.push(pipeline);
  }
  // final entry boilerplate
  const finalShaderCode = [FieldModulusWGSL, finalEntry];
  const finalEntryShaderModule = createGpuShaderModule(gpu, finalShaderCode);
  const finalEntryInputBuffer = gpu.createBuffer({
    size: arrayBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  });
  const finalEntryResultBuffer = gpu.createBuffer({
    size: nonArryBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const finalEntryBindGroupLayout = createBindGroupLayout(gpu, [finalEntryInputBuffer], ["read-only-storage"]);
  const finalEntryBindGroup = createBindGroup(gpu, finalEntryBindGroupLayout, [finalEntryInputBuffer], finalEntryResultBuffer);
  const finalEntryPipeline = gpu.createComputePipeline({
    layout: gpu.createPipelineLayout({bindGroupLayouts: [finalEntryBindGroupLayout]}),
    compute: { 
      module: finalEntryShaderModule,
      entryPoint: "main"
    }
  });

  // Stitch it all together, rip. This can easily be cleaned up and DRY'd by cba
  const commandEncoder = gpu.createCommandEncoder();

  // initial hash compute pass
  runComputePass(commandEncoder, firstHashPipeline, firstHashBindGroup, Math.ceil(numInputs / workgroupSize));

  commandEncoder.copyBufferToBuffer(
    firstHashResultBuffer /* source buffer */,
    0 /* source offset */,
    fullRoundInputBuffers[0][0] /* destination buffer */,
    0 /* destination offset */,
    arrayBufferSize /* size */
  );

  // First 4 full rounds
  for (let i = 0; i < fullRoundPipelines.length; i++) { 
    runComputePass(commandEncoder, fullRoundPipelines[i], fullRoundBindGroups[i], Math.ceil(numInputs / workgroupSize));
    if (i !== fullRoundPipelines.length - 1) {
      commandEncoder.copyBufferToBuffer(
        fullRoundResultBuffers[i] /* source buffer */,
        0 /* source offset */,
        fullRoundInputBuffers[i + 1][0] /* destination buffer */,
        0 /* destination offset */,
        arrayBufferSize /* size */
      );
    }
  }

  commandEncoder.copyBufferToBuffer(
    fullRoundResultBuffers[fullRoundResultBuffers.length - 1] /* source buffer */,
    0 /* source offset */,
    partialRoundInputBuffers[0][0] /* destination buffer */,
    0 /* destination offset */,
    arrayBufferSize /* size */
  );

  // 31 partial rounds
  for (let i = 0; i < partialRoundPipelines.length; i++) { 
    runComputePass(commandEncoder, partialRoundPipelines[i], partialRoundBindGroups[i], Math.ceil(numInputs / workgroupSize));
    if (i !== partialRoundPipelines.length - 1) { 
      commandEncoder.copyBufferToBuffer(
        partialRoundResultBuffers[i] /* source buffer */,
        0 /* source offset */,
        partialRoundInputBuffers[i + 1][0] /* destination buffer */,
        0 /* destination offset */,
        arrayBufferSize /* size */
      );
    }
  }

  commandEncoder.copyBufferToBuffer(
    partialRoundResultBuffers[partialRoundResultBuffers.length - 1] /* source buffer */,
    0 /* source offset */,
    lastFullRoundInputBuffers[0][0] /* destination buffer */,
    0 /* destination offset */,
    arrayBufferSize /* size */
  );

  // Last 4 full rounds
  for (let i = 0; i < lastFullRoundPipelines.length; i++) { 
    runComputePass(commandEncoder, lastFullRoundPipelines[i], lastFullRoundBindGroups[i], Math.ceil(numInputs / workgroupSize));
    if (i !== lastFullRoundPipelines.length - 1) { 
      commandEncoder.copyBufferToBuffer(
        lastFullRoundResultBuffers[i] /* source buffer */,
        0 /* source offset */,
        lastFullRoundInputBuffers[i + 1][0] /* destination buffer */,
        0 /* destination offset */,
        arrayBufferSize /* size */
      );
    }
  }

  // Take output from last full round and put into final entry input buffer
  commandEncoder.copyBufferToBuffer(
    lastFullRoundResultBuffers[lastFullRoundResultBuffers.length - 1] /* source buffer */,
    0 /* source offset */,
    finalEntryInputBuffer /* destination buffer */,
    0 /* destination offset */,
    arrayBufferSize /* size */
  );

  const gpuReadBuffer = gpu.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * numInputs * 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  runComputePass(commandEncoder, finalEntryPipeline, finalEntryBindGroup, Math.ceil(numInputs / workgroupSize));

  commandEncoder.copyBufferToBuffer(
    finalEntryResultBuffer /* source buffer */,
    0 /* source offset */,
    gpuReadBuffer /* destination buffer */,
    0 /* destination offset */,
    nonArryBufferSize /* size */
  );

  const gpuCommands = commandEncoder.finish();
  gpu.queue.submit([gpuCommands]);

  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = gpuReadBuffer.getMappedRange();
  const result = new Uint32Array(arrayBuffer.slice(0));
  gpuReadBuffer.unmap();
  
  return result;
};








const getDevice = async () => {
  if (!("gpu" in navigator)) {
    console.log("WebGPU is not supported on this device");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
  if (!adapter) { 
    console.log("Adapter not found");
    return;
  }
  return await adapter.requestDevice();
}

const createU32ArrayInputBuffer = (device: GPUDevice, uint32s: Uint32Array): GPUBuffer => {
  const gpuBufferU32Inputs = device.createBuffer({
    mappedAtCreation: true,
    size: uint32s.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const arrayBufferInput = gpuBufferU32Inputs.getMappedRange();
  new Uint32Array(arrayBufferInput).set(uint32s);
  gpuBufferU32Inputs.unmap();
  return gpuBufferU32Inputs;
};

const createGpuShaderModule = (device: GPUDevice, shaderModules: string[]): GPUShaderModule => {
  return device.createShaderModule({
    code: shaderModules.join("\n")
  });
}

const createBindGroupLayout = (device: GPUDevice, gpuInputBuffers: GPUBuffer[], types: GPUBufferBindingType[]) => {
  // Bind group layout and bind group
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  for (let i = 0; i < gpuInputBuffers.length; i++) {
    layoutEntries.push({
      binding: i,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: types[i]
      }
    });
  }

  const resultLayoutEntry: GPUBindGroupLayoutEntry = {
    binding: gpuInputBuffers.length,
    visibility: GPUShaderStage.COMPUTE,
    buffer: {
      type: "storage"
    }
  };

  layoutEntries.push(resultLayoutEntry);

  const layout = { entries: layoutEntries };

  return device.createBindGroupLayout(layout);
};

const createBindGroup = (device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, gpuInputBuffers: GPUBuffer[], gpuOutputBuffer: GPUBuffer) => {
  const entriesToBind = gpuInputBuffers.map((gpuInputBuffer, i) => {
    return {
      binding: i,
      resource: {
        buffer: gpuInputBuffer
      }
    };
  });

  entriesToBind.push({
    binding: gpuInputBuffers.length,
    resource: {
      buffer: gpuOutputBuffer
    }
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: entriesToBind
  });

  return bindGroup;
};

const runComputePass = (commandEncoder: GPUCommandEncoder, pipeline: GPUComputePipeline, bindGroup: GPUBindGroup, workgroupCount: number) => { 
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(workgroupCount);
  passEncoder.end();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_poseidon_multi = field_poseidon_multi;