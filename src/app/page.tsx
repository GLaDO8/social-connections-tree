import { GraphProvider } from "@/context/GraphContext";
import GraphCanvas from "@/components/GraphCanvas";
import TempAddForm from "@/components/TempAddForm";

export default function Home() {
  return (
    <GraphProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-950">
        <div className="flex-1 relative">
          <GraphCanvas />
        </div>
        <TempAddForm />
      </div>
    </GraphProvider>
  );
}
