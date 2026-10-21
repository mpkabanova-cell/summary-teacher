import { useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LESSONS, SUBJECT, GRADE, formatLessonDate, getSelectedLesson, nearestLessonIndex, searchLessons } from "@/lib/lesson-directory";

export function LessonSelector({ lessonNumber, onChange, disabled }: {
  lessonNumber?: number | undefined; onChange: (number?: number) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [nearestIndex, setNearestIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = getSelectedLesson(lessonNumber);
  const results = searchLessons(query);
  const closest = LESSONS[nearestIndex];

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) { setQuery(""); setNearestIndex(nearestLessonIndex(LESSONS)); }
  }

  return (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>Предмет</span>
          <Input value={SUBJECT} readOnly aria-label="Предмет" className="h-9" />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>Класс</span>
          <Input value={GRADE} readOnly aria-label="Класс" className="h-9" />
        </label>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Тема урока</p>
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="outline" disabled={disabled} onClick={() => changeOpen(true)}
            aria-label="Тема урока" aria-haspopup="dialog"
            className="h-auto min-h-11 min-w-0 flex-1 justify-between whitespace-normal text-left">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 break-words">{selected ? `№ ${selected.number} · ${selected.title}` : "Выбрать тему урока"}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
          {selected && <Button variant="ghost" size="icon" disabled={disabled} onClick={() => onChange(undefined)} aria-label="Убрать выбранную тему" title="Убрать выбранную тему"><X className="h-4 w-4" /></Button>}
        </div>
        {selected && <p className="text-xs text-muted-foreground">{selected.quarter} · Неделя {selected.week} · {formatLessonDate(selected.dates[0] ?? "")}{selected.dates.length > 1 ? ` — ${formatLessonDate(selected.dates.at(-1) ?? "")}` : ""}</p>}
      </div>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent aria-describedby={undefined} className="lesson-dialog gap-3 rounded-lg p-4 sm:max-w-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const list = listRef.current;
            const row = list?.querySelector<HTMLButtonElement>(`[data-lesson="${closest?.number}"]`);
            if (!list || !row) return;
            row.focus({ preventScroll: true });
            list.scrollTop = Math.max(0, nearestIndex - 3) * row.offsetHeight;
          }}>
          <DialogTitle className="pr-6">Математика · 6 класс</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Поиск по темам и номерам уроков" placeholder="Поиск темы или номера урока" value={query}
              onChange={(event) => { setQuery(event.target.value); if (listRef.current) listRef.current.scrollTop = 0; }} className="pl-9" />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{query ? `Найдено: ${results.length}` : `170 уроков · 2026–2027`}</span>
            {!query && closest && <span>Ближайший: № {closest.number}</span>}
          </div>
          <div ref={listRef} className="lesson-list overflow-y-auto rounded-md border border-border" role="group" aria-label="Темы уроков">
            {results.map((lesson) => (
              <Button key={lesson.number} data-lesson={lesson.number} variant="ghost" onClick={() => { onChange(lesson.number); changeOpen(false); }}
                aria-pressed={lessonNumber === lesson.number}
                className={`lesson-row flex w-full justify-start gap-2 rounded-none border-b border-border px-3 py-1 text-left whitespace-normal ${lesson.number === closest?.number && !query ? "bg-secondary text-secondary-foreground" : ""}`}>
                <span className="w-9 shrink-0 text-xs font-semibold">№ {lesson.number}</span>
                <span className="min-w-0 flex-1"><span className="line-clamp-2 text-xs leading-4">{lesson.title}</span></span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{formatLessonDate(lesson.dates[0] ?? "").slice(0, 5)}</span>
                {lessonNumber === lesson.number && <Check className="h-3 w-3 shrink-0 text-primary" />}
              </Button>
            ))}
            {!results.length && <p className="p-6 text-center text-sm text-muted-foreground">Темы не найдены</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}