import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudyPlanHandoff } from './study-plan-handoff';

export default function StudyPlanPage() {
  return <AuthenticatedHome role="STUDENT"><StudyPlanHandoff /></AuthenticatedHome>;
}
