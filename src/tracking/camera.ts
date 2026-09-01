export const startCamera = async (
  video: HTMLVideoElement,
  { width, height }: { width: number; height: number },
): Promise<MediaStream> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: width }, height: { ideal: height } },
    audio: false,
  })
  video.srcObject = stream
  // ios safari needs these to autoplay inline without a tap
  video.muted = true
  video.playsInline = true
  await video.play()
  return stream
}

export const stopCamera = (stream: MediaStream) => stream.getTracks().forEach((t) => t.stop())
