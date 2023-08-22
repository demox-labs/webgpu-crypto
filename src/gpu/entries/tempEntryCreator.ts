import { bigIntToU32Array, bigIntsToU32Array } from "../utils";

export const tempEntry = async(
input: Uint32Array,
shaderModules: string[],
byteSizePerFirstInput?: number,
byteSizePerOutput?: number
) => {
const bytesPerFirstInput = byteSizePerFirstInput ?? 8;
//console.log("Bytes Per First Input");
//console.log(bytesPerFirstInput);
const bytesPerOutput = byteSizePerOutput ?? 8;
//console.log("Bytes Per Output");
//console.log(bytesPerOutput);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const device = (await getDevice())!;

const numInputs = input.length / bytesPerFirstInput;
//console.log("Num Inputs");
//console.log(numInputs);

let shaderCode = '';
for (const shaderModule of shaderModules) {
    shaderCode += shaderModule;
}

const module = device.createShaderModule({
    code: shaderCode
});

const gpuBufferInputs = [createU32ArrayInputBuffer(device, input)];

// Result Matrix
const resultBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * bytesPerOutput;
const resultBuffer = device.createBuffer({
    size: resultBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
});

// const zeroBigInts = [BigInt(0), BigInt(1), BigInt(0), BigInt(1)];
// const zeroPoint = bigIntsToU32Array(zeroBigInts);
// const zeroU32 = new Uint32Array(Uint32Array.BYTES_PER_ELEMENT * (numInputs / 16) * 32);
// for (let i = 0; i < (numInputs / 16); i++) {
//     zeroU32.set(zeroPoint, i * zeroPoint.length);
// }

// device.queue.writeBuffer(resultBuffer, 0, zeroU32);

// Bind group layout and bind group
const bindGroupLayout = createBindGroupLayout(device, gpuBufferInputs);
const bindGroup = createBindGroup(device, bindGroupLayout, gpuBufferInputs, resultBuffer);

// Pipeline setup

const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
    }),
    compute: {
    module: module,
    entryPoint: "main"
    }
});

// Commands submission
const commandEncoder = device.createCommandEncoder();

const passEncoder = commandEncoder.beginComputePass();
passEncoder.setPipeline(computePipeline);
passEncoder.setBindGroup(0, bindGroup);
const workgroupCount = Math.ceil(numInputs / 2);
console.log('numInputs', numInputs);
console.log('workgroupCount', workgroupCount);
passEncoder.dispatchWorkgroups(workgroupCount);
passEncoder.end();

// Get a GPU buffer for reading in an unmapped state.
const gpuReadBuffer = device.createBuffer({
    size: resultBufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
});

// Encode commands for copying buffer to buffer.
commandEncoder.copyBufferToBuffer(
    resultBuffer /* source buffer */,
    0 /* source offset */,
    gpuReadBuffer /* destination buffer */,
    0 /* destination offset */,
    resultBufferSize /* size */
);

// Submit GPU commands.
const gpuCommands = commandEncoder.finish();
device.queue.submit([gpuCommands]);

// Read buffer.
await gpuReadBuffer.mapAsync(GPUMapMode.READ);
const arrayBuffer = gpuReadBuffer.getMappedRange();
const result = new Uint32Array(arrayBuffer.slice(0));
gpuReadBuffer.unmap();

return result;
}

const getDevice = async () => {
if (!("gpu" in navigator)) {
    console.log(
    "WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag."
    );
    return;
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
    console.log("Failed to get GPU adapter.");
    return;
}
return await adapter.requestDevice();
};

const createU32ArrayInputBuffer = (device: GPUDevice, uint32s: Uint32Array) => {
const gpuBufferU32Inputs = device.createBuffer({
    mappedAtCreation: true,
    size: uint32s.byteLength,
    usage: GPUBufferUsage.STORAGE
});
const arrayBufferInput = gpuBufferU32Inputs.getMappedRange();
new Uint32Array(arrayBufferInput).set(uint32s);
gpuBufferU32Inputs.unmap();
return gpuBufferU32Inputs;
};

const createBindGroupLayout = (device: GPUDevice, gpuInputBuffers: GPUBuffer[]) => {
// Bind group layout and bind group
const layoutEntries: GPUBindGroupLayoutEntry[] = [];
for (let i = 0; i < gpuInputBuffers.length; i++) {
    layoutEntries.push({
    binding: i,
    visibility: GPUShaderStage.COMPUTE,
    buffer: {
        type: "read-only-storage"
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