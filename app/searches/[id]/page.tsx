import Link from "next/link";
import { notFound } from "next/navigation";
import { getSearch } from "@/lib/pulsar/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataSourceGrid } from "@/components/data-source-grid";
import { HistoricPanel } from "@/components/historic-panel";
import { LiveCollectionPanel } from "@/components/live-collection-panel";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SearchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const search = await getSearch(id);

  if (!search) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← All searches
      </Link>

      <div className="mt-2 mb-8 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {search.name || `Search ${search.id}`}
        </h1>
        <Badge variant="outline">{search.type}</Badge>
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Data sources</TabsTrigger>
          <TabsTrigger value="historic">Historic ingestion</TabsTrigger>
          <TabsTrigger value="live">Live collection</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="pt-6">
          <DataSourceGrid
            searchId={id}
            initialCategories={search.categories ?? []}
            initialOnlineNewsLicenses={search.onlineNewsLicenses ?? []}
            initialPrintNewsLicenses={search.printNewsLicenses ?? []}
            broadcastLicenses={search.broadcastLicenses ?? []}
          />
        </TabsContent>

        <TabsContent value="historic" className="pt-6">
          <HistoricPanel
            searchId={id}
            initialHistorics={search.historics ?? []}
            searchCategories={search.categories ?? []}
          />
        </TabsContent>

        <TabsContent value="live" className="pt-6">
          <LiveCollectionPanel
            searchId={id}
            realtimeStatus={search.realtimeStatus}
            rtStartedAt={search.rtStartedAt}
            rtStoppedAt={search.rtStoppedAt}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
