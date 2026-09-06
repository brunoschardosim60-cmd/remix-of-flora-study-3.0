type SyncError = { message: string } | null;

export function requireMedicineProgressRead<T>(result: { data: T | null; error: SyncError }): T | null {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export function confirmMedicineProgressWrite(result: { data: { user_id: string } | null; error: SyncError }, userId: string) {
  if (result.error) throw new Error(result.error.message);
  if (result.data?.user_id !== userId) throw new Error("A gravação do progresso médico não foi confirmada pelo servidor.");
}
