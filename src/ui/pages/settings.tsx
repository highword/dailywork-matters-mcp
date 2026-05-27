import { SettingsForm } from '../components/settings/settings-form';

export function Component() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <SettingsForm />
    </div>
  );
}
