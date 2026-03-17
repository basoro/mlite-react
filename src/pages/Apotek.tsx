import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Search, 
  Calendar as CalendarIcon, 
  Pill, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Stethoscope,
  ClipboardList,
  BedDouble,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getApotekRalanList, getApotekRanapList, getResepDetailItems, validasiResep, simpanObatResep, simpanItemKasir, getRiwayatPerawatan } from '@/lib/api';
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Apotek = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"ralan" | "ranap">("ralan");
  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(),
  });
  const [search, setSearch] = useState("");
  const [selectedResep, setSelectedResep] = useState<any>(null);

  // Modal State
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processItems, setProcessItems] = useState<any[]>([]);
  const [newItemSearch, setNewItemSearch] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Fetch Resep List
  const { data: resepData, isLoading: isLoadingResep, refetch: refetchResep } = useQuery({
    queryKey: ['resep-obat', activeTab, date.from, date.to, search],
    queryFn: () => activeTab === 'ralan'
      ? getApotekRalanList(1, 100, search, format(date.from, 'yyyy-MM-dd'), format(date.to, 'yyyy-MM-dd'))
      : getApotekRanapList(1, 100, search, format(date.from, 'yyyy-MM-dd'), format(date.to, 'yyyy-MM-dd')),
  });

  // Fetch Detail Resep (Items)
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['resep-detail', selectedResep?.no_resep, activeTab],
    queryFn: () => getResepDetailItems(selectedResep?.no_resep, selectedResep?.no_rawat, activeTab),
    enabled: !!selectedResep?.no_resep,
  });

  // Fetch Riwayat Perawatan for Header Data (Settings)
  const { data: riwayatPerawatanData } = useQuery({
    queryKey: ['riwayatPerawatan', selectedResep?.no_rkm_medis, selectedResep?.no_rawat],
    queryFn: () => getRiwayatPerawatan(selectedResep.no_rkm_medis, selectedResep.no_rawat),
    enabled: !!selectedResep?.no_rkm_medis && !!selectedResep?.no_rawat,
  });

  const settings = riwayatPerawatanData?.data?.settings || {};

  const resepList = resepData?.data || [];
  const resepItems = detailData?.data || [];

  // Fetch Inventory for Search
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-search', newItemSearch, activeTab],
    queryFn: () => searchObatApotek(newItemSearch, activeTab),
    enabled: newItemSearch.length > 2,
  });

  // searchObatApotek returns the array directly or wrapped in data
  const searchResults = inventoryData?.data || (Array.isArray(inventoryData) ? inventoryData : []);

  // Update processItems when resepItems changes (if modal is open or just opened)
  useEffect(() => {
    if (isProcessModalOpen && resepItems.length > 0) {
       // Merge existing processItems with new resepItems to keep local edits if any?
       // Or just reset? Better reset to source of truth if items added/removed.
       // But we don't want to lose current edits if background refresh happens.
       // Only update if length matches or if we just added an item.
       // For simplicity, let's re-initialize processItems only when modal opens OR when we explicitly ask for it.
    }
  }, [resepItems]);

  const handleOpenProcessModal = () => {
    setProcessItems(JSON.parse(JSON.stringify(resepItems))); // Deep copy
    setIsProcessModalOpen(true);
  };

  const handleProcessItemChange = (idx: number, field: string, value: any) => {
    const newItems = [...processItems];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setProcessItems(newItems);
  };

  const handleAddNewItem = async (item: any) => {
    if (!selectedResep) return;
    
    setIsAddingItem(true);
    try {
        await simpanObatResep({
            no_resep: selectedResep.no_resep,
            kode_brng: item.kode_brng,
            jml: 1, // Default 1
            aturan_pakai: '3x1', // Default rule
        }, activeTab);
        
        toast({
            title: "Berhasil",
            description: "Obat berhasil ditambahkan",
        });
        
        // Refetch details
        const res = await getResepDetailItems(selectedResep.no_resep, selectedResep.no_rawat, activeTab);
        if (res.status === 'success') {
            setProcessItems(res.data); // Update modal items
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Gagal",
            description: "Gagal menambahkan obat",
        });
    } finally {
        setIsAddingItem(false);
        setNewItemSearch("");
    }
  };

  const handleSaveValidation = async () => {
    if (!selectedResep) return;

    // Prepare payload
    const payload: any = {
        no_resep: selectedResep.no_resep,
        no_rawat: selectedResep.no_rawat,
        penyerahan: 'validasi', // Trigger validasi logic
        jumlah: {},
        aturan_pakai: {},
        kandungan: {},
        embalase: {}, // Optional: Add inputs for these if needed
        tuslah: {}    // Optional
    };

    processItems.forEach(item => {
        if (item.jenis === 'Obat' || item.jenis === 'Racikan Detail') {
             payload.jumlah[item.kode_brng] = item.jml;
             payload.aturan_pakai[item.kode_brng] = item.aturan_pakai;
        }
        // Racikan header quantity update logic if needed
        if (item.jenis === 'Racikan') {
            // Usually we update ingredients, but maybe we want to update racikan header 'jml_dr' (bungkus)
            // Backend postValidasiResep handles 'jml_dr' update if we pass it correctly?
            // postValidasiResep logic:
            // if(isset($item['no_racik'])) { ... update resep_dokter_racikan set jml_dr = ... }
            // It uses $jumlahData[$item['kode_brng']] for ingredients.
            // For header? It seems it loops through INGREDIENTS ($get_resep_dokter_racikan).
            // And updates header for EACH ingredient? That's inefficient but that's how it looked.
            // Wait, resep_dokter_racikan table has jml_dr.
            // The loop updates 'resep_dokter_racikan' table.
            // So if we send the same quantity for all ingredients, it updates the header multiple times.
            // But we don't have a 'kode_brng' for the header row in our payload structure easily map-able.
            // Unless we use a special key or rely on ingredients.
        }
    });

    try {
        await validasiResep(payload, activeTab);
        toast({
            title: "Berhasil",
            description: "Resep berhasil diproses dan divalidasi",
        });
        setIsProcessModalOpen(false);
        refetchResep();
        setSelectedResep(null);
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Gagal",
            description: "Gagal memproses resep",
        });
    }
  };

  const handlePenyerahan = async () => {
    if (!selectedResep) return;

    try {
        await validasiResep({
            no_resep: selectedResep.no_resep,
            no_rawat: selectedResep.no_rawat,
            penyerahan: 'penyerahan'
        }, activeTab);

        toast({
            title: "Berhasil",
            description: "Obat berhasil diserahkan",
        });
        refetchResep();
        // Update selected resep locally or close? 
        // Maybe just refetch and keep selected to show updated status if we displayed penyerahan status.
        // But for now just refetch.
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Gagal",
            description: "Gagal melakukan penyerahan obat",
        });
    }
  };

  // Stats
  const stats = {
    total: resepList.length,
    selesai: resepList.filter((r: any) => r.tgl_perawatan !== '0000-00-00' && r.tgl_perawatan !== null).length,
    menunggu: resepList.filter((r: any) => r.tgl_perawatan === '0000-00-00' || r.tgl_perawatan === null).length,
  };

  const handlePrintEtiket = (item: any) => {
    // Implement print functionality here
    // Example: Open a new window with print layout or trigger backend print job
    console.log("Printing etiket for:", item);
    
    // For now, let's just simulate printing
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Etiket ${item.nama_brng}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; text-align: center; }
                        .etiket { border: 2px solid #000; padding: 10px; border-radius: 8px; }
                        .rs-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
                        .rs-text { font-weight: normal; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #000}
                        .patient-name { font-weight: bold; font-size: 12px; margin-top: 5px; margin-bottom: 10px; }
                        .drug-name { font-weight: bold; font-size: 16px; margin: 10px 0; }
                        .rule { font-size: 14px; }
                        .footer { font-size: 10px; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="etiket">
                        <div class="rs-name">${settings.nama_instansi || 'RS mLITE Indonesia'}</div>
                        <div class="rs-text">${settings.alamat || 'Jl. Perintis Kemerdekaan No. 45'}</div>
                        <div class="patient-name">Pasien: ${selectedResep?.nm_pasien}</div>
                        <div class="date">${format(new Date(), 'dd/MM/yyyy')}</div>
                        <div class="drug-name">${item.nama_brng}</div>
                        <div class="rule">${item.aturan_pakai}</div>
                        <div class="footer">Semoga Lekas Sembuh</div>
                    </div>
                    <script>
                        window.print();
                        window.onafterprint = function() { window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
  };

  const renderDetailItem = (item: any, idx: number) => {
    const isRacikanHeader = item.jenis === 'Racikan';
    const isRacikanDetail = item.jenis === 'Racikan Detail';
    const isResepValidated = selectedResep && selectedResep.tgl_perawatan && selectedResep.tgl_perawatan !== '0000-00-00';
    
    return (
      <div 
        key={idx} 
        className={cn(
          "border-b pb-4 last:border-0 border-blue-100",
          isRacikanDetail && "pl-8 bg-slate-50/50 py-2 border-dashed",
          isRacikanHeader && "bg-blue-50/80 pt-4 px-2 rounded-t-md border-b-2 border-blue-200"
        )}
      >
         <div className="flex justify-between items-center mb-1">
            <h4 className={cn(
              "font-semibold text-sm",
              isRacikanHeader ? "text-blue-900" : "text-slate-800"
            )}>
              {isRacikanDetail ? `- ${item.nama_brng}` : (isRacikanHeader ? `Racikan: ${item.nama_brng}` : `${idx + 1}. ${item.nama_brng}`)}
            </h4>
            <div className="flex items-center gap-2">
                {!isRacikanHeader && !isRacikanDetail && (
                  <Badge variant="outline" className="text-[10px]">{item.jml} {item.kode_sat}</Badge>
                )}
                {isRacikanHeader && (
                   <Badge className="bg-blue-600 text-[10px]">{item.jml} Bungkus</Badge>
                )}
                {/* Print Button if Validated and NOT Racikan Detail (usually header or single drug) */}
                {isResepValidated && !isRacikanDetail && (
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0" 
                        onClick={() => handlePrintEtiket(item)}
                        title="Cetak Etiket"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-printer text-slate-500 hover:text-blue-600"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                    </Button>
                )}
            </div>
         </div>
         
         {!isRacikanHeader ? (
           <div className="text-xs text-slate-500">
              {isRacikanDetail ? (
                <span>Kandungan: {item.kandungan} | Jml: {item.jml}</span>
              ) : (
                <span>Aturan: {item.aturan_pakai}</span>
              )}
           </div>
         ) : (
            <div className="text-xs text-blue-800 mt-1">
               <span className="font-medium">Aturan: {item.aturan_pakai}</span>
               {item.keterangan && <div className="italic mt-1">"{item.keterangan}"</div>}
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Apotek</h1>
        <p className="text-muted-foreground">
          Kelola resep masuk, validasi, dan penyerahan obat
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "ralan" | "ranap"); setSelectedResep(null); }} className="w-full">
        <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="ralan" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Rawat Jalan
              </TabsTrigger>
              <TabsTrigger value="ranap" className="flex items-center gap-2">
                <BedDouble className="h-4 w-4" />
                Rawat Inap
              </TabsTrigger>
            </TabsList>
        </div>
      </Tabs>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resep</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Periode terpilih</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Layanan</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.menunggu}</div>
            <p className="text-xs text-muted-foreground">Perlu segera diproses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.selesai}</div>
            <p className="text-xs text-muted-foreground">Sudah diserahkan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List Resep */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daftar Resep Masuk ({activeTab === 'ralan' ? 'Rawat Jalan' : 'Rawat Inap'})</CardTitle>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !date.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} -{" "}
                              {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pilih Tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date.from}
                        selected={{ from: date.from, to: date.to }}
                        onSelect={(range) => {
                          if (range?.from) {
                            setDate({ from: range.from, to: range.to || range.from });
                          }
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="icon" onClick={() => refetchResep()}>
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. Resep / Pasien..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto min-h-[400px]">
              {isLoadingResep ? (
                <div className="space-y-2">
                   {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Resep</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Dokter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resepList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Tidak ada data resep
                        </TableCell>
                      </TableRow>
                    ) : (
                      resepList.map((resep: any) => (
                        <TableRow 
                          key={resep.no_resep} 
                          className={cn("cursor-pointer hover:bg-muted/50 transition-colors", selectedResep?.no_resep === resep.no_resep && "bg-blue-50/50")}
                          onClick={() => setSelectedResep(resep)}
                        >
                          <TableCell className="font-medium">{resep.no_resep}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{resep.tgl_peresepan}</span>
                              <span className="text-xs text-muted-foreground">{resep.jam_peresepan}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span>{resep.nm_pasien || resep.no_rawat}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[120px]">{resep.nm_dokter || resep.kd_dokter}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {resep.tgl_perawatan && resep.tgl_perawatan !== '0000-00-00' ? (
                              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Selesai</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">Menunggu</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="hover:text-blue-600"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedResep(resep);
                                }}
                            >
                                Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detail */}
        <div className="space-y-4">
          <Card className="h-full border-l-4 border-l-blue-500">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5 text-blue-500" />
                Detail Resep
              </CardTitle>
              {selectedResep ? (
                <CardDescription>
                  {selectedResep.no_resep} • {selectedResep.tgl_peresepan}
                </CardDescription>
              ) : (
                <CardDescription>Pilih resep untuk melihat detail</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {!selectedResep ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center">
                  <Pill className="h-16 w-16 mb-4 opacity-10" />
                  <p>Silakan pilih resep dari tabel di sebelah kiri</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Patient Info Summary */}
                  <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pasien:</span>
                      <span className="font-medium">{selectedResep.nm_pasien}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">No. RM:</span>
                      <span className="font-medium">{selectedResep.no_rkm_medis}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dokter:</span>
                      <span className="font-medium">{selectedResep.nm_dokter}</span>
                    </div>
                  </div>

                  {/* Medicine List */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm flex items-center gap-2 border-b pb-2">
                      <ClipboardList className="h-4 w-4" />
                      Daftar Obat & Racikan
                    </h3>
                    
                    {isLoadingDetail ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : resepItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada item obat</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {resepItems.map((item: any, idx: number) => renderDetailItem(item, idx))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            {selectedResep && (
              <CardFooter className="border-t pt-4 bg-slate-50/50 flex flex-col gap-2">
                {selectedResep.tgl_perawatan && selectedResep.tgl_perawatan !== '0000-00-00' ? (
                    <>
                        <Button 
                            className="w-full"
                            variant="outline"
                            disabled
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Sudah Divalidasi
                        </Button>
                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={handlePenyerahan}
                            disabled={selectedResep.tgl_penyerahan && selectedResep.tgl_penyerahan !== '0000-00-00'}
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          {selectedResep.tgl_penyerahan && selectedResep.tgl_penyerahan !== '0000-00-00' ? 'Sudah Diserahkan' : 'Penyerahan Obat'}
                        </Button>
                    </>
                ) : (
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleOpenProcessModal}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Proses & Validasi
                    </Button>
                )}
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Proses & Validasi */}
      <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Proses & Validasi Resep</DialogTitle>
                <DialogDescription>
                    Sesuaikan jumlah, aturan pakai, dan tambahkan obat jika diperlukan.
                </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
                
                {/* Add Medicine Section */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <Label className="mb-2 block">Tambah Obat / Alkes</Label>
                    <Command className="border rounded-md bg-white">
                        <CommandInput 
                            placeholder="Cari obat (ketik min. 3 karakter)..." 
                            value={newItemSearch}
                            onValueChange={setNewItemSearch}
                        />
                        <CommandList>
                            <CommandEmpty>Tidak ada obat ditemukan.</CommandEmpty>
                            {searchResults.map((item: any) => (
                                <CommandItem 
                                    key={item.kode_brng}
                                    value={item.nama_brng}
                                    onSelect={() => handleAddNewItem(item)}
                                    disabled={isAddingItem}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.nama_brng}</span>
                                            <span className="text-xs text-muted-foreground">Stok: {item.stok} {item.kode_sat}</span>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-6">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandList>
                    </Command>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                    {processItems.map((item: any, idx: number) => {
                         const isRacikanHeader = item.jenis === 'Racikan';
                         const isRacikanDetail = item.jenis === 'Racikan Detail';

                         return (
                            <div 
                                key={idx} 
                                className={cn(
                                    "grid grid-cols-12 gap-4 items-center p-3 rounded-lg border",
                                    isRacikanHeader ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100",
                                    isRacikanDetail && "ml-8 border-dashed bg-slate-50/50"
                                )}
                            >
                                <div className="col-span-4">
                                    <span className={cn("font-medium text-sm", isRacikanHeader && "text-blue-800")}>
                                        {item.nama_brng}
                                    </span>
                                    {isRacikanDetail && <div className="text-xs text-slate-500">Kandungan: {item.kandungan}</div>}
                                </div>
                                
                                <div className="col-span-2">
                                    <Label className="text-[10px] text-muted-foreground">Jumlah</Label>
                                    <Input 
                                        type="number" 
                                        className="h-8" 
                                        value={item.jml} 
                                        onChange={(e) => handleProcessItemChange(idx, 'jml', e.target.value)}
                                    />
                                </div>

                                <div className="col-span-4">
                                    <Label className="text-[10px] text-muted-foreground">Aturan Pakai</Label>
                                    {isRacikanDetail ? (
                                        <div className="text-sm text-slate-500 italic">-</div>
                                    ) : (
                                        <Input 
                                            className="h-8" 
                                            value={item.aturan_pakai} 
                                            onChange={(e) => handleProcessItemChange(idx, 'aturan_pakai', e.target.value)}
                                            placeholder="Contoh: 3x1 Sesudah Makan"
                                        />
                                    )}
                                </div>

                                <div className="col-span-2 flex justify-end">
                                    {/* Delete Button (Optional - needs backend support) */}
                                    {/* <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button> */}
                                </div>
                            </div>
                         );
                    })}
                </div>
            </div>

            <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={() => setIsProcessModalOpen(false)}>Batal</Button>
                <Button onClick={handleSaveValidation} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Simpan & Validasi
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Apotek;
