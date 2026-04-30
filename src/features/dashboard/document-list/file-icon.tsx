import { File, FileAudio2, FileImage, FileSpreadsheet, FileText, Folder } from "lucide-react";

import { getFileExtension } from "./formatters";

export function getFileIcon(fileName: string, typeLabel?: string) {
  if ((typeLabel ?? "").toLowerCase().includes("dossier")) {
    return <Folder className="h-5 w-5 text-[#4b5563]" />;
  }
  const extension = getFileExtension(fileName);

  if (!extension) {
    return <Folder className="h-5 w-5 text-[#4b5563]" />;
  }
  if (["pdf"].includes(extension)) {
    return <FileText className="h-5 w-5 text-[#ef4444]" />;
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return <FileImage className="h-5 w-5 text-[#f97316]" />;
  }
  if (["m4a", "mp3", "wav", "ogg"].includes(extension)) {
    return <FileAudio2 className="h-5 w-5 text-[#2563eb]" />;
  }
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileSpreadsheet className="h-5 w-5 text-[#16a34a]" />;
  }

  return <File className="h-5 w-5 text-[#2563eb]" />;
}
