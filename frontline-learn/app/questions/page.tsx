import Header from "@/components/Header";
import QuestionsLoop from "@/components/QuestionsLoop";

export const metadata = { title: "Questions to courses · Frontline Learn concept" };

export default function QuestionsPage() {
  return (
    <div>
      <Header active="questions" />
      <QuestionsLoop />
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-slate-400">
        Concept prototype with fictional stores, questions and results. Not affiliated with any company.
      </footer>
    </div>
  );
}
