import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getCases, getUsers, updateCase } from '@/lib/api';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  User, 
  MapPin, 
  ArrowLeft,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SchedulingSystemProps {
  onBack: () => void;
}

interface ScheduledHearing {
  id: string;
  caseId: string;
  caseTitle: string;
  date: Date;
  time: string;
  duration: number;
  courtroom: string;
  judge: string;
  type: 'preliminary' | 'trial' | 'sentencing' | 'motion' | 'arraignment';
  status: 'scheduled' | 'confirmed' | 'postponed' | 'completed';
  notes?: string;
}

const demoHearings: ScheduledHearing[] = [
  {
    id: 'DEMO-H-001',
    caseId: 'DEMO-CASE-2026-001',
    caseTitle: 'Justice Link Demo Matter 001',
    date: new Date(2026, 4, 22),
    time: '09:00',
    duration: 120,
    courtroom: 'Justice Link Demo Courtroom',
    judge: 'Demo Presiding Judge',
    type: 'preliminary',
    status: 'scheduled'
  },
  {
    id: 'DEMO-H-002',
    caseId: 'DEMO-CASE-2026-002',
    caseTitle: 'Justice Link Demo Civil Matter',
    date: new Date(2026, 4, 23),
    time: '14:00',
    duration: 180,
    courtroom: 'Justice Link Demo Courtroom',
    judge: 'Demo Presiding Judge',
    type: 'trial',
    status: 'confirmed'
  }
];

const courtrooms = [
  'Justice Link Demo Courtroom', 'Demo Courtroom A', 'Demo Courtroom B', 'Demo Mediation Room'
];

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export function SchedulingSystem({ onBack }: SchedulingSystemProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'calendar' | 'list'>('calendar');
  const [isNewHearingOpen, setIsNewHearingOpen] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newHearing, setNewHearing] = useState({
    caseId: '',
    date: new Date(),
    time: '',
    duration: 120,
    courtroom: '',
    type: 'preliminary',
    notes: ''
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([getCases(), getUsers().catch(() => [])])
      .then(([c, u]) => {
        if (!mounted) return;
        setCases(Array.isArray(c) ? c : []);
        setUsers(Array.isArray(u) ? u : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load scheduling data');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const activeCases = useMemo(() => cases.filter((c: any) => ['active', 'pending'].includes(c.status)), [cases]);
  const hearings = useMemo<ScheduledHearing[]>(() => {
    const liveHearings = cases
      .filter((case_: any) => case_.nextHearing)
      .map((case_: any) => {
        const date = new Date(case_.nextHearing);
        return {
          id: `H-${case_.externalId || case_.id}`,
          caseId: case_.externalId || case_.id,
          caseTitle: case_.title,
          date,
          time: format(date, 'HH:mm'),
          duration: 120,
          courtroom: case_.hearingLocation || 'Justice Link Demo Courtroom',
          judge: case_.judge?.name || 'Demo Presiding Judge',
          type: 'preliminary' as const,
          status: 'scheduled' as const,
          notes: 'Synthetic local demo hearing',
        };
      });
    return liveHearings.length ? liveHearings : demoHearings;
  }, [cases]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-warning text-warning-foreground';
      case 'confirmed': return 'bg-success text-success-foreground';
      case 'postponed': return 'bg-destructive text-destructive-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trial': return 'bg-primary text-primary-foreground';
      case 'preliminary': return 'bg-gold text-gold-foreground';
      case 'sentencing': return 'bg-destructive text-destructive-foreground';
      case 'motion': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleScheduleHearing = async () => {
    if (!newHearing.caseId || !newHearing.time || !newHearing.courtroom) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const [hour, minute] = newHearing.time.split(':').map(Number);
    const scheduledAt = new Date(newHearing.date);
    scheduledAt.setHours(hour || 0, minute || 0, 0, 0);

    try {
      const updated = await updateCase(newHearing.caseId, {
        status: 'active',
        nextHearing: scheduledAt.toISOString(),
        hearingLocation: newHearing.courtroom,
      });
      setCases((prev) => prev.map((case_) => {
        const id = case_.externalId || case_.id;
        return id === newHearing.caseId ? { ...case_, ...updated } : case_;
      }));
      toast({
        title: "Demo hearing scheduled",
        description: "The synthetic court hearing has been recorded locally.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to schedule hearing",
        description: e?.response?.data?.error || e.message || "Could not update the demo case.",
        variant: "destructive",
      });
      return;
    }

    setIsNewHearingOpen(false);
    setNewHearing({
      caseId: '',
      date: new Date(),
      time: '',
      duration: 120,
      courtroom: '',
      type: 'preliminary',
      notes: ''
    });
  };

  const openEditHearing = (hearing: ScheduledHearing) => {
    setNewHearing({
      caseId: hearing.caseId,
      date: hearing.date,
      time: hearing.time,
      duration: hearing.duration,
      courtroom: hearing.courtroom,
      type: hearing.type,
      notes: hearing.notes || ''
    });
    setIsNewHearingOpen(true);
  };

  const getDayHearings = (date: Date) => {
    return hearings.filter(hearing => 
      hearing.date.toDateString() === date.toDateString()
    );
  };

  const hasConflicts = (date: Date, time: string, courtroom: string) => {
    return hearings.some(hearing =>
      hearing.date.toDateString() === date.toDateString() &&
      hearing.time === time &&
      hearing.courtroom === courtroom
    );
  };

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
            <h1 className="text-3xl font-serif font-bold text-foreground">Court Scheduling</h1>
            <p className="text-muted-foreground">Manage hearings and court sessions</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex border border-border rounded-lg">
            <Button
              variant={currentView === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('calendar')}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={currentView === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('list')}
            >
              List
            </Button>
          </div>
          <Dialog open={isNewHearingOpen} onOpenChange={setIsNewHearingOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Hearing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif">Schedule New Hearing</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label>Case *</Label>
                    <Select value={newHearing.caseId} onValueChange={(value) => setNewHearing({...newHearing, caseId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select case" />
                      </SelectTrigger>
                      <SelectContent>
                        {loading ? (
                          <div className="px-2 py-1 text-sm text-muted-foreground">Loading…</div>
                        ) : error ? (
                          <div className="px-2 py-1 text-sm text-destructive">{error}</div>
                        ) : activeCases.map((case_) => (
                          <SelectItem key={case_.id} value={case_.externalId || case_.id}>
                            {case_.title} ({case_.externalId || case_.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Hearing Type *</Label>
                    <Select value={newHearing.type} onValueChange={(value) => setNewHearing({...newHearing, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preliminary">Preliminary Hearing</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="sentencing">Sentencing</SelectItem>
                        <SelectItem value="motion">Motion Hearing</SelectItem>
                        <SelectItem value="arraignment">Arraignment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date *</Label>
                    <Calendar
                      mode="single"
                      selected={newHearing.date}
                      onSelect={(date) => date && setNewHearing({...newHearing, date})}
                      className="rounded-md border"
                      disabled={(date) => date < new Date()}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Time *</Label>
                    <Select value={newHearing.time} onValueChange={(value) => setNewHearing({...newHearing, time: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => {
                          const hasConflict = hasConflicts(newHearing.date, time, newHearing.courtroom);
                          return (
                            <SelectItem key={time} value={time} disabled={hasConflict}>
                              <div className="flex items-center justify-between w-full">
                                <span>{time}</span>
                                {hasConflict && <AlertTriangle className="w-3 h-3 text-destructive ml-2" />}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={newHearing.duration}
                      onChange={(e) => setNewHearing({...newHearing, duration: parseInt(e.target.value) || 120})}
                      min="30"
                      step="30"
                    />
                  </div>

                  <div>
                    <Label>Courtroom *</Label>
                    <Select value={newHearing.courtroom} onValueChange={(value) => setNewHearing({...newHearing, courtroom: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select courtroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {courtrooms.map((room) => {
                          const hasConflict = hasConflicts(newHearing.date, newHearing.time, room);
                          return (
                            <SelectItem key={room} value={room} disabled={hasConflict}>
                              <div className="flex items-center justify-between w-full">
                                <span>{room}</span>
                                {hasConflict && <AlertTriangle className="w-3 h-3 text-destructive ml-2" />}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={newHearing.notes}
                      onChange={(e) => setNewHearing({...newHearing, notes: e.target.value})}
                      placeholder="Additional notes or instructions..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleScheduleHearing} className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Schedule Hearing
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      {currentView === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif">Court Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border w-full"
                  modifiers={{
                    hasHearings: (date) => getDayHearings(date).length > 0
                  }}
                  modifiersStyles={{
                    hasHearings: {
                      backgroundColor: 'hsl(var(--accent))',
                      color: 'hsl(var(--accent-foreground))'
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Hearings */}
          <div>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  {format(selectedDate, 'MMM dd, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getDayHearings(selectedDate).length > 0 ? (
                  <div className="space-y-3">
                    {getDayHearings(selectedDate).map((hearing) => (
                      <div key={hearing.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{hearing.time}</span>
                          <Badge className={getStatusColor(hearing.status)}>
                            {hearing.status}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{hearing.caseTitle}</h4>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {hearing.courtroom}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {hearing.duration} min
                          </div>
                          <Badge className={getTypeColor(hearing.type)} variant="outline">
                            {hearing.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hearings scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* List View */
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif">All Scheduled Hearings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hearings
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((hearing) => (
                <div key={hearing.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{hearing.caseTitle}</h3>
                      <Badge className={getTypeColor(hearing.type)}>
                        {hearing.type}
                      </Badge>
                      <Badge className={getStatusColor(hearing.status)}>
                        {hearing.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {format(hearing.date, 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {hearing.time} ({hearing.duration} min)
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {hearing.courtroom}
                      </div>
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {hearing.judge}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditHearing(hearing)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditHearing(hearing)}>
                      Reschedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
