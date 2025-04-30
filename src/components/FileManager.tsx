import React, { useState, useEffect, ChangeEvent, DragEvent, JSX } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { Document, Page, pdfjs } from 'react-pdf';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import mammoth from 'mammoth';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const fileIcons: Record<string, string> = {
    'text/plain': '📝',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
    'application/pdf': '📜',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📄',
    'image/jpeg': '🖼️',
    'image/png': '🖼️',
    'video/mp4': '🎥',
    default: '📁',
};

const MAX_PREVIEW_SIZE = 32 * 1024 * 1024; // 32 MB

interface ServerFile {
    name: string;
    type: string;
    url: string;
    content?: string;
}

interface FileManagerProps {
    trialId: string;
}

const FileManager: React.FC<FileManagerProps> = ({ trialId }) => {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const [files, setFiles] = useState<ServerFile[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<ServerFile[]>([]);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadMessage, setUploadMessage] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [excelError, setExcelError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedFile, setSelectedFile] = useState<ServerFile | null>(null);
    const [textContent, setTextContent] = useState<string>('');
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [useIframeForPdf, setUseIframeForPdf] = useState<boolean>(false);

    const authHeaders: Record<string, string> = {
        Authorization: `Bearer ${token}`,
    };

    useEffect(() => {
        if (!token) {
            toast.info('Вы не авторизованы, перенаправляем на страницу входа...');
            navigate('/login', { replace: true });
            return;
        }

        const fetchFiles = async (): Promise<void> => {
            try {
                const response = await fetch(`http://localhost:5000/api/trials/${trialId}/files`, {
                    headers: authHeaders,
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
                }

                const data: ServerFile[] = await response.json();
                const filesWithContent = await Promise.all(
                    data.map(async (file) => {
                        const fileSize = await getFileSize(file.url);
                        if (fileSize > MAX_PREVIEW_SIZE) return file;

                        try {
                            const content = await fetchFileContent(file);
                            return { ...file, content };
                        } catch (error) {
                            console.error(`Error reading content of ${file.name}:`, error);
                            return file;
                        }
                    })
                );

                setFiles(filesWithContent);
                setFilteredFiles(filesWithContent);
            } catch (error) {
                handleFetchError(error);
            }
        };

        fetchFiles();
    }, [trialId, token, navigate]);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        setFilteredFiles(
            query
                ? files.filter(
                      (file) =>
                          file.name.toLowerCase().includes(query) ||
                          (file.content && file.content.toLowerCase().includes(query))
                  )
                : files
        );
    }, [searchQuery, files]);

    const getFileSize = async (url: string): Promise<number> => {
        const response = await fetch(url, { method: 'HEAD', headers: authHeaders });
        if (!response.ok) throw new Error(`Failed to fetch file metadata: ${response.status}`);
        return parseInt(response.headers.get('content-length') || '0', 10);
    };

    const fetchFileContent = async (file: ServerFile): Promise<string> => {
        const response = await fetch(file.url, { headers: authHeaders });
        if (!response.ok) throw new Error(`Failed to fetch file content: ${response.status}`);

        if (file.type === 'text/plain' || file.name.endsWith('.log')) {
            return response.text();
        }
        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            return jsonData.flat().join(' ').toLowerCase();
        }
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value.toLowerCase();
        }
        return '';
    };

    const handleFetchError = (error: unknown): void => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching files:', error);
        if (!message.includes('Unauthorized')) {
            toast.error('Не удалось загрузить файлы. Попробуйте позже.');
        } else {
            logout();
            navigate('/login', { replace: true });
        }
    };

    const handleFileUpload = async (file: globalThis.File): Promise<void> => {
        setUploading(true);
        setUploadMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`http://localhost:5000/api/trials/${trialId}/upload`, {
                method: 'POST',
                headers: authHeaders,
                body: formData,
            });

            if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

            setUploadMessage('Файл успешно загружен!');
            await refreshFiles();
            toast.success('Файл успешно загружен!');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setUploadMessage(`Ошибка: ${message}`);
            if (!message.includes('Unauthorized')) toast.error('Не удалось загрузить файл.');
        } finally {
            setUploading(false);
            setIsDragging(false);
        }
    };

    const refreshFiles = async (): Promise<void> => {
        const response = await fetch(`http://localhost:5000/api/trials/${trialId}/files`, { headers: authHeaders });
        if (!response.ok) throw new Error(`Failed to fetch files: ${response.status}`);
        const data: ServerFile[] = await response.json();
        const filesWithContent = await Promise.all(
            data.map(async (file) => {
                const fileSize = await getFileSize(file.url);
                if (fileSize > MAX_PREVIEW_SIZE) return file;
                const content = await fetchFileContent(file);
                return { ...file, content };
            })
        );
        setFiles(filesWithContent);
        setFilteredFiles(filesWithContent);
    };

    const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const readExcelFile = async (url: string): Promise<void> => {
        setIsLoading(true);
        try {
            const response = await fetch(url, { headers: authHeaders });
            if (!response.ok) throw new Error('Failed to fetch Excel file');
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            setExcelData(jsonData.slice(0, 5));
            setExcelError(null);
        } catch (error) {
            setExcelError('Не удалось загрузить предпросмотр Excel-файла');
            console.error('Error reading Excel file:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const readTextContent = async (file: ServerFile): Promise<void> => {
        setIsLoading(true);
        try {
            const fileSize = await getFileSize(file.url);
            if (fileSize > MAX_PREVIEW_SIZE) {
                setTextContent('Файл слишком большой для предпросмотра. Скачайте файл для просмотра.');
                return;
            }

            const response = await fetch(file.url, { headers: authHeaders });
            if (!response.ok) throw new Error('Failed to fetch file content');

            if (file.type === 'text/plain' || file.name.endsWith('.log')) {
                setTextContent(await response.text());
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const arrayBuffer = await response.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                setTextContent(result.value);
            }
        } catch (error) {
            setTextContent('Не удалось загрузить содержимое файла');
            console.error(`Error reading text content of ${file.name}:`, error);
        } finally {
            setIsLoading(false);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
        setNumPages(numPages);
        setPdfError(null);
        setIsLoading(false);
    };

    const onDocumentLoadError = (error: Error): void => {
        console.error('Error loading PDF with react-pdf:', error);
        setPdfError(`Не удалось загрузить PDF: ${error.message}`);
        setUseIframeForPdf(true);
        setIsLoading(false);
    };

    const openModal = async (file: ServerFile): Promise<void> => {
        setSelectedFile(file);
        setExcelData([]);
        setTextContent('');
        setNumPages(null);
        setPdfError(null);
        setExcelError(null);
        setIsLoading(true);
        setUseIframeForPdf(false);

        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            await readExcelFile(file.url);
        } else if (
            file.type === 'text/plain' ||
            file.name.endsWith('.log') ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            await readTextContent(file);
        } else {
            setIsLoading(false);
        }

        setIsModalOpen(true);
    };

    const closeModal = (): void => {
        setIsModalOpen(false);
        setSelectedFile(null);
        setIsLoading(false);
        setUseIframeForPdf(false);
    };

    const renderModalContent = (): JSX.Element | null => {
        if (!selectedFile) return null;

        if (isLoading) {
            return (
                <div className="p-4 text-center">
                    <p className="text-blue-500">Загрузка...</p>
                    <svg
                        className="animate-spin h-5 w-5 text-blue-500 mx-auto mt-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                </div>
            );
        }

        switch (selectedFile.type) {
            case 'text/plain':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return (
                    <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-100 rounded">
                        <pre className="whitespace-pre-wrap">{textContent || 'Нет содержимого'}</pre>
                    </div>
                );
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return excelError ? (
                    <p className="text-red-500 p-4">{excelError}</p>
                ) : excelData.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                        <table className="border-collapse border w-full">
                            <thead>
                                <tr>
                                    {Object.keys(excelData[0]).map((key) => (
                                        <th key={key} className="border p-2 bg-gray-100">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {excelData.map((row, index) => (
                                    <tr key={index}>
                                        {Object.values(row).map((value, i) => (
                                            <td key={i} className="border p-2">
                                                {String(value)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="p-4">Нет данных для предпросмотра</p>
                );
            case 'application/pdf':
                return useIframeForPdf ? (
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                        {pdfError && <p className="text-red-500 mb-2">{pdfError}</p>}
                        <iframe src={selectedFile.url} className="w-full h-[60vh]" title={selectedFile.name} />
                    </div>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                        {pdfError && <p className="text-red-500 mb-2">{pdfError}</p>}
                        <Document
                            file={selectedFile.url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            options={{
                                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                                cMapPacked: true,
                            }}
                        >
                            {numPages &&
                                Array.from({ length: numPages }, (_, index) => (
                                    <Page key={`page_${index + 1}`} pageNumber={index + 1} width={600} />
                                ))}
                        </Document>
                        {numPages && !pdfError && (
                            <p className="text-sm text-gray-500 mt-2">Всего страниц: {numPages}</p>
                        )}
                    </div>
                );
            case 'image/jpeg':
            case 'image/png':
                return (
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                        <LazyLoadImage
                            src={selectedFile.url}
                            alt={selectedFile.name}
                            effect="blur"
                            className="max-w-full h-auto"
                        />
                    </div>
                );
            case 'video/mp4':
                return (
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                        <video controls className="max-w-full h-auto">
                            <source src={selectedFile.url} type="video/mp4" />
                            Ваш браузер не поддерживает видео.
                        </video>
                    </div>
                );
            default:
                return <p className="p-4">Предпросмотр для этого типа файла недоступен.</p>;
        }
    };

    const renderFile = (file: ServerFile): JSX.Element => {
        const icon = fileIcons[file.type] || fileIcons.default;
        return (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => openModal(file)}>
                <span className="text-2xl">{icon}</span>
                <p className="truncate">{file.name || 'Без названия'}</p>
            </div>
        );
    };

    return (
        <div className="p-4 border rounded bg-gray-50">
            <h3 className="text-lg font-bold mb-4">Файлы испытания {trialId}</h3>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Поиск:</label>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="p-2 border rounded w-full"
                    placeholder="Поиск по имени или содержимому..."
                />
            </div>

            <div
                className={`mb-4 p-4 border-2 border-dashed rounded ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <label className="block text-sm font-medium mb-2">
                    {isDragging ? 'Отпустите файл' : 'Перетащите файл или выберите его'}
                </label>
                <input
                    type="file"
                    onChange={handleFileInputChange}
                    className="p-2 border rounded w-full"
                    disabled={uploading}
                />
                {uploading && <p className="text-blue-500 mt-2">Загрузка...</p>}
                {uploadMessage && (
                    <p className={`mt-2 ${uploadMessage.includes('Ошибка') ? 'text-red-500' : 'text-green-500'}`}>
                        {uploadMessage}
                    </p>
                )}
            </div>

            {filteredFiles.length === 0 ? (
                <p className="text-gray-500">Файлы не найдены</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredFiles.map((file, index) => (
                        <motion.div
                            key={file.url}
                            className="p-4 border rounded bg-white shadow hover:shadow-lg transition-shadow"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            {renderFile(file)}
                        </motion.div>
                    ))}
                </div>
            )}

            {isModalOpen && selectedFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold truncate">{selectedFile.name}</h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 text-xl"
                                aria-label="Закрыть"
                            >
                                ✕
                            </button>
                        </div>
                        {renderModalContent()}
                        <div className="mt-4 flex justify-end">
                            <a
                                href={selectedFile.url}
                                download
                                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Скачать
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileManager;
