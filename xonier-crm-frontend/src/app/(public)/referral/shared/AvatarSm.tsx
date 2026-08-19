export default function AvatarSm({ initials }: { initials: string }) {
  return (
    <span className="mr-2 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-teal-tint text-[10px] font-semibold text-teal-deep align-middle">
      {initials}
    </span>
  );
}
