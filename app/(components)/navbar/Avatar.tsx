import { UserIcon } from '@/app/(components)/ui';

/** The profile avatar: a 28px circle. Inert until accounts exist. */
export default function Avatar() {
  return (
    <button
      type="button"
      className="grid h-7 w-7 flex-none place-items-center rounded-full border border-line-strong text-ink-secondary transition-colors duration-micro hover:text-ink-primary"
      aria-disabled="true"
      aria-label="Your profile — coming soon, once accounts are available"
      title="Profile — coming soon"
    >
      <UserIcon className="h-3.5 w-3.5" />
    </button>
  );
}
