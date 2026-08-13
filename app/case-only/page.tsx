import { CaseOnlyHome } from '@/components/jiuxuange/case-only/case-only-home';
import { listCaseOnlyLessons } from '@/lib/jiuxuange/case-only/catalog';

export default function CaseOnlyHomePage() {
  return <CaseOnlyHome lessons={listCaseOnlyLessons()} />;
}
