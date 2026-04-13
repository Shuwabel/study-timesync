import { useGeneratorStore } from '@/store/generatorStore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { COURSE_COLORS } from '@/lib/constants';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StepCourses() {
  const { courses, updateCourse, addCourse, removeCourse, timetableName, timetableDescription, setTimetableName, setTimetableDescription } = useGeneratorStore();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Name your timetable</h2>
      <p className="text-muted-foreground mb-4">Give it a name and add the courses you're studying.</p>

      <div className="space-y-3 mb-8">
        <Input
          placeholder="e.g. Semester 2 Finals"
          value={timetableName}
          onChange={(e) => setTimetableName(e.target.value)}
          className="text-base"
        />
        <Textarea
          placeholder="What's this timetable for? (optional)"
          value={timetableDescription}
          onChange={(e) => setTimetableDescription(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      <h3 className="text-lg font-semibold mb-3">Courses</h3>
      <div className="space-y-3">
        <AnimatePresence>
          {courses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: COURSE_COLORS[course.colorIndex].hex }}
              />
              <Input
                placeholder={`Course ${i + 1}`}
                value={course.name}
                onChange={(e) => updateCourse(course.id, { name: e.target.value })}
                className="flex-1"
              />
              {courses.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeCourse(course.id)} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {courses.length < 15 && (
        <Button variant="outline" onClick={addCourse} className="mt-4 gap-2 w-full">
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      )}

      <p className="text-xs text-muted-foreground mt-3 text-center">
        {courses.length}/15 courses
      </p>
    </div>
  );
}
