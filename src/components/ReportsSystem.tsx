import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft,
  FileText,
  Download,
  Calendar as CalendarIcon,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Clock,
  Scale
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getPartnerAnalytics } from '@/lib/api';

interface ReportsSystemProps {
  onBack: () => void;
}

interface ReportConfig {
  type: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  filters: {
    caseTypes: string[];
    statuses: string[];
    judges: string[];
    departments: string[];
  };
  format: 'pdf' | 'csv' | 'xlsx';
}

const reportTypes = [
  {
    id: 'case-summary',
    name: 'Case Summary Report',
    description: 'Overview of all cases with status and timeline information',
    icon: FileText,
    estimatedTime: '2-3 minutes'
  },
  {
    id: 'performance-metrics',
    name: 'Performance Metrics',
    description: 'Court efficiency and processing time analytics',
    icon: BarChart3,
    estimatedTime: '3-5 minutes'
  },
  {
    id: 'judge-workload',
    name: 'Judge Workload Analysis',
    description: 'Distribution of cases among judges and caseload statistics',
    icon: Users,
    estimatedTime: '2-4 minutes'
  },
  {
    id: 'case-timeline',
    name: 'Case Timeline Report',
    description: 'Detailed timeline of case progression and milestones',
    icon: Clock,
    estimatedTime: '4-6 minutes'
  },
  {
    id: 'financial-summary',
    name: 'Financial Summary',
    description: 'Court fees, fines, and financial transactions overview',
    icon: TrendingUp,
    estimatedTime: '3-4 minutes'
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit',
    description: 'Regulatory compliance and audit trail documentation',
    icon: Scale,
    estimatedTime: '5-8 minutes'
  }
];

export function ReportsSystem({ onBack }: ReportsSystemProps) {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: '',
    dateRange: {
      from: subMonths(new Date(), 1),
      to: new Date()
    },
    filters: {
      caseTypes: ['criminal', 'civil', 'family', 'corporate'],
      statuses: ['active', 'pending', 'closed'],
      judges: [],
      departments: []
    },
    format: 'pdf'
  });

  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      toast({
        title: "Select Report Type",
        description: "Please select a report type to generate.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate report generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const analytics = await getPartnerAnalytics({
        from: reportConfig.dateRange.from.toISOString(),
        to: reportConfig.dateRange.to.toISOString(),
      });
      clearInterval(progressInterval);
      setGenerationProgress(100);

      const report = reportTypes.find((item) => item.id === selectedReportType);
      const content = JSON.stringify({
        reportType: selectedReportType,
        generatedAt: new Date().toISOString(),
        config: reportConfig,
        analytics,
      }, null, 2);
      setGeneratedReports((prev) => [{
        id: `RPT-${Date.now()}`,
        name: `${report?.name || 'Justice Link Demo Report'} - ${format(new Date(), 'MMM dd, yyyy')}`,
        type: selectedReportType,
        generatedAt: new Date(),
        generatedBy: 'Current user',
        format: reportConfig.format,
        size: `${Math.max(1, Math.round(content.length / 1024))} KB`,
        status: 'completed',
        content,
      }, ...prev]);

      toast({
        title: "Report Generated Successfully",
        description: "The report uses synthetic local Justice Link analytics data.",
      });
    } catch (e: any) {
      clearInterval(progressInterval);
      toast({
        title: "Report Generation Failed",
        description: e?.response?.data?.error || e.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'generating': return 'bg-warning text-warning-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const selectedReport = reportTypes.find(r => r.id === selectedReportType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">Generate comprehensive court reports and analytics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Types */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif">Select Report Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTypes.map((report) => {
                  const Icon = report.icon;
                  return (
                    <div
                      key={report.id}
                      className={cn(
                        "p-4 border border-border rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
                        selectedReportType === report.id && "border-primary bg-accent/30"
                      )}
                      onClick={() => setSelectedReportType(report.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="w-5 h-5 text-primary mt-1" />
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{report.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            Est. {report.estimatedTime}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Report Configuration */}
          {selectedReportType && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif">Report Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range */}
                <div>
                  <h4 className="font-medium mb-3">Date Range</h4>
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="text-sm text-muted-foreground">From</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[200px] justify-start text-left font-normal",
                              !reportConfig.dateRange.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {reportConfig.dateRange.from ? format(reportConfig.dateRange.from, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={reportConfig.dateRange.from}
                            onSelect={(date) => date && setReportConfig({
                              ...reportConfig,
                              dateRange: { ...reportConfig.dateRange, from: date }
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">To</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[200px] justify-start text-left font-normal",
                              !reportConfig.dateRange.to && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {reportConfig.dateRange.to ? format(reportConfig.dateRange.to, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={reportConfig.dateRange.to}
                            onSelect={(date) => date && setReportConfig({
                              ...reportConfig,
                              dateRange: { ...reportConfig.dateRange, to: date }
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div>
                  <h4 className="font-medium mb-3">Filters</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Case Types</label>
                      <div className="flex flex-wrap gap-3">
                        {['criminal', 'civil', 'family', 'corporate'].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox 
                              id={type}
                              checked={reportConfig.filters.caseTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                const newTypes = checked
                                  ? [...reportConfig.filters.caseTypes, type]
                                  : reportConfig.filters.caseTypes.filter(t => t !== type);
                                setReportConfig({
                                  ...reportConfig,
                                  filters: { ...reportConfig.filters, caseTypes: newTypes }
                                });
                              }}
                            />
                            <label htmlFor={type} className="text-sm capitalize">{type}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Case Status</label>
                      <div className="flex flex-wrap gap-3">
                        {['active', 'pending', 'closed', 'archived'].map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox 
                              id={status}
                              checked={reportConfig.filters.statuses.includes(status)}
                              onCheckedChange={(checked) => {
                                const newStatuses = checked
                                  ? [...reportConfig.filters.statuses, status]
                                  : reportConfig.filters.statuses.filter(s => s !== status);
                                setReportConfig({
                                  ...reportConfig,
                                  filters: { ...reportConfig.filters, statuses: newStatuses }
                                });
                              }}
                            />
                            <label htmlFor={status} className="text-sm capitalize">{status}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Output Format</label>
                  <Select value={reportConfig.format} onValueChange={(value: 'pdf' | 'csv' | 'xlsx') => 
                    setReportConfig({ ...reportConfig, format: value })
                  }>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                      <SelectItem value="xlsx">Excel Workbook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Generate Report */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">Generate Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedReport && (
                <div className="p-3 bg-accent/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">{selectedReport.name}</h4>
                  <p className="text-xs text-muted-foreground">{selectedReport.description}</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Generating...</span>
                    <span>{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                </div>
              )}

              <Button 
                onClick={handleGenerateReport}
                disabled={!selectedReportType || isGenerating}
                className="w-full bg-gradient-navy text-primary-foreground hover:opacity-90"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generatedReports.length === 0 && (
                  <div className="text-sm text-muted-foreground">No reports generated in this session.</div>
                )}
                {generatedReports.map((report) => (
                  <div key={report.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{report.name}</h4>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>By {report.generatedBy}</p>
                      <p>{format(report.generatedAt, 'MMM dd, yyyy')}</p>
                      <p>{report.format.toUpperCase()} • {report.size}</p>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => {
                      const blob = new Blob([report.content], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = report.name.replace(/\s+/g, '_') + '.' + report.format;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    }}>
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
