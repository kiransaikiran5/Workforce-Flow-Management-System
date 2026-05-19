// DocumentsPage.jsx – Workforce Flow Management System (Preview fixed)
import { useState, useEffect, useCallback, useRef } from "react";
import API from "../api";
import { toast } from "react-toastify";
import DataTable from "../components/common/DataTable";
import Breadcrumbs from "../components/common/Breadcrumbs";
import Button from "../components/common/Button";
import ErrorState from "../components/common/ErrorState";
import Modal from "../components/common/Modal";

// Helper: get MIME type from filename extension
const getMimeType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const mimes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    log: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  };
  return mimes[ext] || 'application/octet-stream';
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload modal
  const [uploadModal, setUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Preview modal
  const [previewModal, setPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);   // 'image', 'pdf', 'text', 'unsupported'
  const [previewFilename, setPreviewFilename] = useState("");
  const [previewTextContent, setPreviewTextContent] = useState("");  // for text files
  const previewObjectUrl = useRef(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/documents/");
      setDocs(res.data?.data || res.data || []);
    } catch (err) {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ---------- Download ----------
  const handleDownload = async (docId, filename) => {
    try {
      const res = await API.get(`/documents/${docId}/download`, {
        responseType: "blob",
      });
      const mime = getMimeType(filename);
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Download failed");
    }
  };

  // ---------- Preview (fixed) ----------
  const handlePreview = async (docId, filename) => {
    try {
      const res = await API.get(`/documents/${docId}/download`, {
        responseType: "blob",
      });
      const mime = getMimeType(filename);
      const blob = new Blob([res.data], { type: mime });   // set correct MIME
      const url = window.URL.createObjectURL(blob);

      if (previewObjectUrl.current) {
        window.URL.revokeObjectURL(previewObjectUrl.current);
      }
      previewObjectUrl.current = url;

      const ext = filename.split('.').pop().toLowerCase();
      if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
        setPreviewType("image");
        setPreviewUrl(url);
        setPreviewTextContent("");
      } else if (ext === "pdf") {
        setPreviewType("pdf");
        setPreviewUrl(url);            // iframe will load PDF correctly with correct MIME
        setPreviewTextContent("");
      } else if (["txt", "csv", "json", "xml", "log"].includes(ext)) {
        // Read blob as text for a proper readable preview
        const text = await res.data.text();
        setPreviewType("text");
        setPreviewUrl(null);
        setPreviewTextContent(text);
      } else {
        setPreviewType("unsupported");
        setPreviewUrl(null);
        setPreviewTextContent("");
      }

      setPreviewFilename(filename);
      setPreviewModal(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load preview");
    }
  };

  const closePreview = () => {
    if (previewObjectUrl.current) {
      window.URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
    }
    setPreviewModal(false);
    setPreviewUrl(null);
    setPreviewType(null);
    setPreviewFilename("");
    setPreviewTextContent("");
  };

  // ---------- Upload ----------
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await API.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded");
      setUploadModal(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await API.delete(`/documents/${id}`);
      toast.success("Document deleted");
      fetchDocs();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // ---------- Columns ----------
  const columns = [
    { key: "id", label: "ID" },
    { key: "filename", label: "File Name" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => handlePreview(row.id, row.filename)}
            className="text-green-600 hover:underline bg-transparent border-none cursor-pointer">
            Preview
          </button>
          <button onClick={() => handleDownload(row.id, row.filename)}
            className="text-indigo-600 hover:underline bg-transparent border-none cursor-pointer">
            Download
          </button>
          <button onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:underline bg-transparent border-none cursor-pointer">
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Documents" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <Button onClick={() => setUploadModal(true)}>Upload Document</Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchDocs} />
      ) : (
        <DataTable columns={columns} data={docs} loading={loading} emptyMessage="No documents found." />
      )}

      {/* Upload Modal */}
      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <input ref={fileInputRef} type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300" />
          <Button type="submit" loading={uploading} className="w-full">
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </Modal>

      {/* Preview Modal (fixed styles) */}
      <Modal isOpen={previewModal} onClose={closePreview} title={`Preview: ${previewFilename}`} size="large">
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          {previewType === "image" && previewUrl && (
            <img src={previewUrl} alt={previewFilename} className="max-w-full max-h-[70vh] object-contain rounded" />
          )}
          {previewType === "pdf" && previewUrl && (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded border border-gray-300 dark:border-gray-600"
              title={previewFilename} />
          )}
          {previewType === "text" && previewTextContent !== "" && (
            <pre className="w-full h-[70vh] overflow-auto bg-white dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-all">
              {previewTextContent}
            </pre>
          )}
          {previewType === "unsupported" && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-4">📄</p>
              <p>Preview not available for this file type.</p>
              <p className="text-sm mt-2">You can still download it.</p>
            </div>
          )}
          {!previewUrl && previewType !== "text" && previewType !== "unsupported" && (
            <div className="text-gray-400">Loading preview...</div>
          )}
        </div>
      </Modal>
    </div>
  );
}