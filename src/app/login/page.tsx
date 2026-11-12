import { login } from "@/lib/actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ wrong?: string }> }) {
  const { wrong } = await searchParams;
  return (
    <form action={login} className="card mx-auto mt-20 max-w-xs space-y-3">
      <h1 className="h1">Shop Khatha</h1>
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" className="input" autoFocus required />
      </div>
      {wrong && <p className="text-sm text-red-700">Wrong password.</p>}
      <button className="btn w-full">Open</button>
    </form>
  );
}
