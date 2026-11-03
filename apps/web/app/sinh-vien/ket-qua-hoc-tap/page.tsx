import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudentAssessmentResults } from './student-assessment-results';

export default function StudentAssessmentResultsPage() {
  return <AuthenticatedHome role="STUDENT"><StudentAssessmentResults /></AuthenticatedHome>;
}
