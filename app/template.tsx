export default function Template({children}:{children:React.ReactNode}) {
  // Never fade the whole frame to black when a route mounts.
  return <>{children}</>;
}
