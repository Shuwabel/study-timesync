import { useGeneratorStore } from '@/store/generatorStore';
import { COURSE_COLORS } from '@/lib/constants';
import { differenceInDays } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Course } from '@/lib/types';

function SortableItem({ course, index }: { course: Course; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: course.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const daysAway = course.examDate && !course.noExam
    ? differenceInDays(new Date(course.examDate), new Date())
    : null;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="text-sm font-bold text-muted-foreground w-6">{index + 1}</span>
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COURSE_COLORS[course.colorIndex].hex }} />
      <span className="font-medium text-sm flex-1">{course.name}</span>
      {daysAway !== null && (
        <span className="text-xs text-muted-foreground">{daysAway}d left</span>
      )}
    </div>
  );
}

export default function StepPriority() {
  const { courses, reorderCourses } = useGeneratorStore();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = courses.findIndex((c) => c.id === active.id);
      const newIndex = courses.findIndex((c) => c.id === over.id);
      const newOrder = [...courses];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      reorderCourses(newOrder.map((c) => c.id));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Rank your priorities</h2>
      <p className="text-muted-foreground mb-6">Drag to reorder — courses at the top get more study time.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={courses.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {courses.map((course, i) => (
              <SortableItem key={course.id} course={course} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
