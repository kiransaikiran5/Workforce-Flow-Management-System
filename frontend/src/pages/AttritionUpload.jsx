import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";

const AttritionUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) return toast.warn("Please select a CSV or Excel file");
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setProgress(0);
    try {
      const res = await api.post("/predictions/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percent);
        },
      });
      toast.success(
        `Prediction done! High:${res.data.high}, Medium:${res.data.medium}, Low:${res.data.low}`
      );
      navigate("/attrition-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        Upload Employee Dataset
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-6">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-white"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Selected: {file.name}
            </p>
          )}
        </div>

        {uploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
            <p className="text-xs text-gray-500 mt-1">{progress}% uploaded</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Predicting…" : "Upload & Predict Attrition"}
        </button>
        <p className="text-xs text-gray-400 mt-3">
          Supports CSV or Excel with the required columns (Age, Department,
          etc.)
        </p>
      </div>
    </div>
  );
};

export default AttritionUpload;