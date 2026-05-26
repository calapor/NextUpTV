'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EvalPanel } from '@/components/admin/eval-panel'
import { UsageLogsPanel } from '@/components/admin/usage-logs-panel'
import { DemoCachePanel } from '@/components/admin/demo-cache-panel'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">NextUpTV Admin</h1>
      </div>
      <Tabs defaultValue="logs" className="w-full">
        <div className="border-b border-border px-6">
          <TabsList className="h-10 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="logs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 h-10"
            >
              Usage Logs
            </TabsTrigger>
            <TabsTrigger
              value="eval"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 h-10"
            >
              Eval
            </TabsTrigger>
            <TabsTrigger
              value="cache"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 h-10"
            >
              Demo Cache
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="eval" className="mt-0">
          <EvalPanel />
        </TabsContent>
        <TabsContent value="logs" className="mt-0">
          <UsageLogsPanel />
        </TabsContent>
        <TabsContent value="cache" className="mt-0">
          <DemoCachePanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
