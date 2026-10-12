export type UploadResponse = Record<string, unknown>;

export function postFormWithProgress(
  url: string,
  form: FormData,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    signal?.addEventListener("abort", abort, { once: true });
    request.open("POST", url);
    request.upload.onloadstart = () => onProgress(1);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0)
        onProgress(Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100))));
    };
    request.onerror = () => reject(Error("เชื่อมต่อเพื่ออัปโหลดไฟล์ไม่สำเร็จ"));
    request.onabort = () => reject(Error("ยกเลิกการอัปโหลดไฟล์แล้ว"));
    request.onload = () => {
      signal?.removeEventListener("abort", abort);
      let body: UploadResponse = {};
      try { body = JSON.parse(request.responseText || "{}"); } catch {}
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(body);
      } else reject(Error(typeof body.error === "string" ? body.error : "อัปโหลดไฟล์ไม่สำเร็จ"));
    };
    request.send(form);
  });
}
