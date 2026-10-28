import { AuthenticatedHome } from '../../auth/authenticated-home';

export default function StudentHome() {
  return <AuthenticatedHome role="STUDENT" />;
}
