import { AuthenticatedHome } from '../../../auth/authenticated-home';
import { StudyPlanAdjustment } from './study-plan-adjustment';

export default function StudyPlanAdjustmentPage() {
  return <AuthenticatedHome role="STUDENT"><StudyPlanAdjustment /></AuthenticatedHome>;
}
