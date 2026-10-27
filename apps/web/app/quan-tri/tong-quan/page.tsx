import { AuthenticatedHome } from '../../auth/authenticated-home';

export default function AdministratorHome() {
  return <AuthenticatedHome role="ADMINISTRATOR" />;
}
