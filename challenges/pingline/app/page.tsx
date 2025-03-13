import FetchForm from "@/app/components/FetchForm";

export default async function IndexPage() {
  return (
    <main className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-300 via-red-300 to-pink-300">
      <div className="w-full max-w-3xl text-white bg-black/30 px-10 py-8 shadow-lg rounded-md">
        <h1 className="text-2xl font-bold mb-1">PING-x</h1>
        <p className="text-sm mb-3 text-white/75">
          The free, online ping tool.
          <p className="font-semibold">
            Service will restart every 30 seconds in case of some bad hackers
            may attempt to abuse the service.
          </p>
        </p>
        <FetchForm />
      </div>
    </main>
  );
}
