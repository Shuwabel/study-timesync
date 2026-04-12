import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTimetables, deleteTimetable } from '@/lib/storage';
import { Timetable } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Plus, Trash2, Eye, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);

  useEffect(() => {
    setTimetables(getTimetables());
  }, []);

  const handleDelete = (id: string) => {
    deleteTimetable(id);
    setTimetables(getTimetables());
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>StudySync</span>
          </Link>
          <Link to="/generate">
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New</Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-2xl font-bold mb-6">Your Timetables</h1>

        {timetables.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <CalendarDays className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No timetables yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first AI-powered study timetable and start studying smarter.
            </p>
            <Link to="/generate">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create My First Timetable
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {timetables.map((tt, i) => (
              <motion.div
                key={tt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate">{tt.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(tt.createdAt), 'MMM d, yyyy')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tt.courses.length} courses · {tt.sessions.length} sessions
                    </p>
                    <div className="flex gap-2">
                      <Link to={`/timetable/${tt.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(tt.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
