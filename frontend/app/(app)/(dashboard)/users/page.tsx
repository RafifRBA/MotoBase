import { RoleGate } from "@/components/role-gate";
import { UserList } from "@/features/users/user-list";
import { ACCESS } from "@/lib/permissions";

export const instant = false;

export default function UsersPage() {
  return (
    <RoleGate allow={ACCESS.usersRead}>
      <UserList />
    </RoleGate>
  );
}
