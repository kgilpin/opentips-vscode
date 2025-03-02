/**
 * Extract code from a markdown buffer. If the buffer contains a code fence, the code inside the fence is returned. Otherwise, the entire buffer is returned.
 * @param buffer The markdown buffer to extract code from.
 * @returns The code extracted from the buffer.
 */
export default function extractCode(buffer: string): string {
  const output: string[] = [];
  let inFence = false;
  for (const line of buffer.split("\n")) {
    if (inFence) {
      if (line.startsWith("```")) {
        inFence = false;
      } else {
        output.push(line);
      }
    } else {
      if (line.startsWith("```")) {
        inFence = true;
      }
    }
  }
  if (output.length === 0) {
    output.push(buffer);
  }
  return output.join("\n");
}
