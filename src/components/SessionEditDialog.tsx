import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDuration } from '@/lib/schedule';
import { SESSION_TYPES } from '@/lib/constants';
import type { StudySession } from '@/lib/types';

const LENGTHS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

export interface SessionEdit {
  duration: number;
  sessionType: StudySession['sessionType'];
  date: string;
}

export default function SessionEditDialog({
  session,
  onClose,
  onSave,
}: {
  session: StudySession | null;
  onClose: () => void;
  onSave: (session: StudySession, edit: SessionEdit) => void;
}) {
  const [duration, setDuration] = useState(1);
  const [type, setType] = useState<StudySession['sessionType']>('Focus');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (session) {
      setDuration(session.duration);
      setType(session.sessionType);
      setDate(session.date);
    }
  }, [session]);

  return (
    <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>{session ? `${session.courseName} at ${session.startTime}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Day</Label>
            <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-length">Length</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(parseFloat(v))}>
              <SelectTrigger id="edit-length">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTHS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {formatDuration(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as StudySession['sessionType'])}>
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!date} onClick={() => session && onSave(session, { duration, sessionType: type, date })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
