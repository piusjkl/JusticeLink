import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, ArrowLeft, Save, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getUsers, createCase } from '@/lib/api';
import { DemoNotice } from './DemoNotice';

interface CaseRegistrationProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CaseRegistration({ onBack, onSuccess }: CaseRegistrationProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    plaintiff: '',
    plaintiffDob: null as Date | null,
    plaintiffAddress: '',
    defendant: '',
  assignedJudge: '',
  assignedLawyer: '',
  assignedProsecutor: '',
    priority: 'medium',
    description: '',
    filingDate: new Date(),
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [judges, setJudges] = useState<any[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [prosecutors, setProsecutors] = useState<any[]>([]);
  useEffect(() => {
    getUsers().then((data) => {
      setJudges(data.filter((u: any) => u.role === 'judge'));
      setLawyers(data.filter((u: any) => u.role === 'lawyer'));
      setProsecutors(data.filter((u: any) => u.role === 'prosecutor'));
    }).catch(() => {
      setJudges([]);
      setLawyers([]);
      setProsecutors([]);
    });
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        externalId: `DEMO-CASE-${new Date().getFullYear()}-${Math.floor(Math.random()*900 + 100)}`,
        title: formData.title,
        type: formData.type,
        filingDate: formData.filingDate.toISOString(),
        plaintiff: formData.plaintiff,
        plaintiffAddress: formData.plaintiffAddress || undefined,
        plaintiffAge: formData.plaintiffDob ? Math.max(0, Math.floor((Date.now() - formData.plaintiffDob.getTime()) / (365.25*24*3600*1000))) : undefined,
        defendant: formData.defendant,
        description: formData.description,
        priority: formData.priority,
      };
      if (formData.assignedJudge) payload.judgeId = formData.assignedJudge;
      if (formData.assignedLawyer) payload.lawyerId = formData.assignedLawyer;
      if (formData.assignedProsecutor) payload.prosecutorId = formData.assignedProsecutor;
      await createCase(payload);
      toast({ title: 'Case Registered', description: 'A new case has been created.' });
      setIsSubmitting(false);
      onSuccess();
    } catch (err: any) {
      setIsSubmitting(false);
      toast({ title: 'Error', description: err.message || 'Failed to create case', variant: 'destructive' });
    }
  };

  const isFormValid = formData.title && formData.type && formData.plaintiff && formData.defendant && formData.plaintiffAddress && formData.plaintiffDob;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Register New Case</h1>
            <p className="text-muted-foreground">Create a synthetic local demo court case and assign personnel</p>
          </div>
        </div>
      </div>

      <DemoNotice compact />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Case Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Case Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., State v. Defendant or Plaintiff v. Defendant"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Case Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="criminal">Criminal</SelectItem>
                        <SelectItem value="civil">Civil</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="plaintiff">Plaintiff *</Label>
                    <Input
                      id="plaintiff"
                      value={formData.plaintiff}
                      onChange={(e) => handleInputChange('plaintiff', e.target.value)}
                      placeholder="Plaintiff name or entity"
                      required
                    />
                  </div>

                    <div>
                      <Label>Plaintiff DOB *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.plaintiffDob && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.plaintiffDob ? format(formData.plaintiffDob, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.plaintiffDob ?? undefined}
                            onSelect={(date) => handleInputChange('plaintiffDob', date || null)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="col-span-2">
                      <Label>Plaintiff Address *</Label>
                      <Input value={formData.plaintiffAddress} onChange={(e) => handleInputChange('plaintiffAddress', e.target.value)} placeholder="Street, City" />
                    </div>

                  <div>
                    <Label htmlFor="defendant">Defendant *</Label>
                    <Input
                      id="defendant"
                      value={formData.defendant}
                      onChange={(e) => handleInputChange('defendant', e.target.value)}
                      placeholder="Defendant name or entity"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="filingDate">Filing Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.filingDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.filingDate ? format(formData.filingDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.filingDate}
                        onSelect={(date) => date && handleInputChange('filingDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="description">Case Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed description of the case, charges, or claims..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Personnel Assignment */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personnel Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="assignedJudge">Assigned Judge</Label>
                    <Select value={formData.assignedJudge} onValueChange={(value) => handleInputChange('assignedJudge', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a judge" />
                      </SelectTrigger>
                      <SelectContent>
                        {judges.map((judge) => (
                          <SelectItem key={judge.id} value={judge.id}>
                            {judge.name} - {judge.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="assignedLawyer">Defense Attorney</Label>
                    <Select value={formData.assignedLawyer} onValueChange={(value) => handleInputChange('assignedLawyer', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select defense attorney" />
                      </SelectTrigger>
                      <SelectContent>
                        {lawyers.map((lawyer) => (
                          <SelectItem key={lawyer.id} value={lawyer.id}>
                            {lawyer.name} - {lawyer.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.type === 'criminal' || /republic|state|people/i.test(formData.plaintiff)) && (
                    <div>
                      <Label htmlFor="assignedProsecutor">Prosecutor</Label>
                      <Select value={formData.assignedProsecutor} onValueChange={(value) => handleInputChange('assignedProsecutor', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select prosecutor" />
                        </SelectTrigger>
                        <SelectContent>
                          {prosecutors.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} - {p.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Form Actions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-navy text-primary-foreground hover:opacity-90"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Creating Case...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Register Case
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={onBack}>
                  Cancel
                </Button>
              </CardContent>
            </Card>

            {/* Case ID Preview */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">Case Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Case ID (Auto-generated)</Label>
                  <p className="font-mono text-sm">{`DEMO-CASE-${new Date().getFullYear()}-XXX`}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Filing Date</Label>
                  <p className="text-sm">{format(formData.filingDate, "PPP")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="text-sm">Pending (Initial Registration)</p>
                </div>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">Registration Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• All required fields must be completed</li>
                  <li>• Case titles should follow standard naming conventions</li>
                  <li>• Personnel assignments can be changed later</li>
                  <li>• Evidence upload is mocked in local demo mode</li>
                  <li>• Initial hearings can be scheduled post-registration</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
