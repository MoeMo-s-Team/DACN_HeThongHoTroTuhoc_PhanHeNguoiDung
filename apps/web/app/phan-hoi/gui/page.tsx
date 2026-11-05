import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudentFeedback } from './student-feedback';

export default function StudentFeedbackPage() {
  return <AuthenticatedHome role="STUDENT"><StudentFeedback /></AuthenticatedHome>;
}
