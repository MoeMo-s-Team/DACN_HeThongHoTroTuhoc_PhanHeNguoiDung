import { AuthenticatedHome } from '../../auth/authenticated-home';
import { LearningAnalysis } from './learning-analysis';

export default function LearningAnalysisPage() {
  return <AuthenticatedHome role="STUDENT"><LearningAnalysis /></AuthenticatedHome>;
}
