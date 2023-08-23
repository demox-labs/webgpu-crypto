export async function loadWasmModule() {
  const Aleo = await import('./aleo_wasm.js');
  return Aleo;
}