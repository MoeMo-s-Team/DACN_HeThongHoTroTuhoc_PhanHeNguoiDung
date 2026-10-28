import { AuthenticatedHome } from '../../auth/authenticated-home';

export default function TeacherHome() {
  return <AuthenticatedHome role="TEACHER" />;
}
