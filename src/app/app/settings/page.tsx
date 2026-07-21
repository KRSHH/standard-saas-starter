import { buildMetadata } from "@/lib/seo";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { readSignedUrlForOwner } from "@/lib/uploads/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { ChangeEmailForm } from "@/components/settings/change-email-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { LinkedAccounts } from "@/components/settings/linked-accounts";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ResendVerificationButton } from "@/components/settings/resend-verification-button";

export const metadata = buildMetadata({
  title: "Settings",
  description: "Manage your account settings",
  path: "/app/settings",
  noIndex: true,
});

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: identitiesData } = await supabase.auth.getUserIdentities();
  const identities = (identitiesData?.identities ?? []).map((i) => ({
    id: i.id,
    provider: i.provider,
    email: i.identity_data?.email ?? null,
  }));

  const emailVerified = Boolean(user.email_confirmed_at);
  const pendingNewEmail = user.new_email ?? null;

  // Resolve a fresh signed URL for the avatar (private bucket).
  const avatarUrl = profile?.avatarUrl
    ? await readSignedUrlForOwner(profile.avatarUrl, user)
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="mt-8">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="linked">Linked accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <section className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Avatar</h2>
              <AvatarUploader
                initialAvatarUrl={avatarUrl}
                fullName={profile?.fullName ?? ""}
                email={user.email ?? ""}
              />
            </div>
            <div className="flex flex-col gap-4 border-t pt-6">
              <h2 className="text-lg font-semibold">Display name</h2>
              <ProfileForm defaultFullName={profile?.fullName ?? ""} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Email address</h2>
              <p className="text-muted-foreground text-sm">
                Current: <span className="text-foreground">{user.email}</span>
              </p>
              {!emailVerified ? (
                <div className="flex items-center gap-3 rounded-md border border-dashed p-3 text-sm">
                  <span className="text-muted-foreground">
                    Email not verified yet.
                  </span>
                  <ResendVerificationButton />
                </div>
              ) : null}
              <div className="mt-2">
                <ChangeEmailForm
                  email={user.email ?? ""}
                  pendingNewEmail={pendingNewEmail}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-6">
              <h2 className="text-destructive text-lg font-semibold">
                Danger zone
              </h2>
              <p className="text-muted-foreground text-sm">
                Permanently delete your account and all associated data.
              </p>
              <DeleteAccountDialog email={user.email ?? ""} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Change password</h2>
            <p className="text-muted-foreground text-sm">
              Choose a new password. You may be asked to confirm your identity.
            </p>
            <ChangePasswordForm email={user.email ?? ""} />
          </section>
        </TabsContent>

        <TabsContent value="linked" className="mt-6">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Sign-in methods</h2>
            <p className="text-muted-foreground text-sm">
              Methods available to sign in to your account.
            </p>
            <LinkedAccounts identities={identities} />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
