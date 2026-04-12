import { useGeneratorStore } from '@/store/generatorStore';
import { COURSE_COLORS, DIFFICULTY_LABELS } from '@/lib/constants';
import { Star } from 'lucide-react';

export default function StepDifficulty() {
  const { courses, updateCourse } = useGeneratorStore();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Rate difficulty</h2>
      <p className="text-muted-foreground mb-6">How hard is each course? Harder courses get more study time.</p>

      <div className="space-y-4">
        {courses.map((course) => (
          <div key={course.id} className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COURSE_COLORS[course.colorIndex].hex }} />
              <span className="font-medium text-sm">{course.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => updateCourse(course.id, { difficulty: level })}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        level <= course.difficulty
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[course.difficulty - 1]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
