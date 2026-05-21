import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCases, uploadCaseFile } from '@/lib/api';
import { Upload, File, X, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadData {
  file: File | null;
  caseId: string;
  description: string;
  category: string;
}

export function FileUpload({ caseId: fixedCaseId }: { caseId?: string }) {
  const { toast } = useToast();
  const [caseOptions, setCaseOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [uploadData, setUploadData] = useState<FileUploadData>({
    file: null,
    caseId: '',
    description: '',
    category: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string;
    size: number;
    status: 'uploading' | 'success' | 'error';
    progress: number;
  }>>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload PDF, DOC, DOCX, JPG, or PNG files only.",
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB.",
          variant: "destructive"
        });
        return;
      }

      setUploadData(prev => ({ ...prev, file }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Validate file type and size (same logic as handleFileSelect)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload PDF, DOC, DOCX, JPG, or PNG files only.",
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB.",
          variant: "destructive"
        });
        return;
      }

      setUploadData(prev => ({ ...prev, file }));
    }
  };

  const simulateUpload = async () => {
    if (!uploadData.file || !uploadData.caseId || !uploadData.category) {
      toast({
        title: "Missing Information",
        description: "Please select a file, case, and category before uploading.",
        variant: "destructive"
      });
      return;
    }
    try {
      setIsUploading(true);
      // call backend
      await uploadCaseFile(uploadData.caseId, uploadData.file);
      // Update history list
      setUploadedFiles(prev => [...prev, { name: uploadData.file!.name, size: uploadData.file!.size, status: 'success', progress: 100 }]);
      // Reset form
      setUploadData({ file: null, caseId: '', description: '', category: '' });
      toast({ title: 'Demo Upload Recorded', description: 'Evidence metadata was recorded locally; no file was stored in demo mode.' });
    } catch (e: any) {
      toast({ title: 'Upload Failed', description: e?.response?.data?.error || 'Try again later', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // Load cases from backend
  useEffect(() => {
    if (fixedCaseId) {
      // If a fixed caseId is provided, set it and skip loading all cases for selection
      setUploadData(prev => ({ ...prev, caseId: fixedCaseId }));
      return;
    }
    getCases().then((data) => {
      const normalized = data.map((c: any) => ({ id: c.externalId || c.id, title: c.title }));
      setCaseOptions(normalized);
      setUploadData(prev => ({ ...prev, caseId: normalized[0]?.id || '' }));
    }).catch(() => {
      setCaseOptions([]);
    });
  }, [fixedCaseId]);

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>;
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Document Upload</h1>
          <p className="text-muted-foreground">Upload case documents and evidence files</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif flex items-center">
                <Upload className="w-5 h-5 mr-2 text-primary" />
                Upload New Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Drop Zone */}
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                {uploadData.file ? (
                  <div className="flex items-center justify-center space-x-3">
                    <File className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-foreground">{uploadData.file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(uploadData.file.size)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadData(prev => ({ ...prev, file: null }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                )}
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="case">Select Case *</Label>
                  {fixedCaseId ? (
                    <Input id="case" value={fixedCaseId} disabled readOnly />
                  ) : (
                    <Select value={uploadData.caseId} onValueChange={(value) => setUploadData(prev => ({ ...prev, caseId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a case..." />
                      </SelectTrigger>
                      <SelectContent>
                        {caseOptions.map((case_) => (
                          <SelectItem key={case_.id} value={case_.id}>
                            {case_.id} - {case_.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Document Category *</Label>
                  <Select value={uploadData.category} onValueChange={(value) => setUploadData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evidence">Evidence</SelectItem>
                      <SelectItem value="legal-brief">Legal Brief</SelectItem>
                      <SelectItem value="motion">Motion</SelectItem>
                      <SelectItem value="exhibit">Exhibit</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="correspondence">Correspondence</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the document and its relevance to the case..."
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex md:justify-end">
                <Button 
                  onClick={simulateUpload} 
                  disabled={isUploading || !uploadData.file}
                  className="w-full md:w-auto md:min-w-[200px] bg-gradient-navy text-primary-foreground hover:opacity-90"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Status / Guidelines (sticky on large screens) */}
        <div className="lg:sticky lg:top-24 h-max">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Upload History</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(file.status)}
                        <div>
                          <p className="text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      {file.status === 'uploading' && (
                        <div className="text-xs text-muted-foreground">{file.progress}%</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card className="shadow-card mt-6">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-accent/40 rounded-md">
                <p className="text-xs text-muted-foreground">Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Best Practices</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <span className="text-sm">Ensure documents are clearly scanned or high quality.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <span className="text-sm">Remove confidential information not relevant to the case.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <span className="text-sm">Use descriptive filenames for easy identification.</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Security & Compliance</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <span className="text-sm">All uploads are scanned for malware and stored securely.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <span className="text-sm">Only upload materials authorized for court use.</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
