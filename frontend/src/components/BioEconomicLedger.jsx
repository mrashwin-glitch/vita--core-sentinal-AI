import React, { useState } from 'react';
import { DollarSign, Landmark, Leaf, TrendingUp, HelpCircle, ShieldAlert, Award, FileCode, Info } from 'lucide-react';

export default function BioEconomicLedger({ selectedField }) {
  const [carbonPrice, setCarbonPrice] = useState(1500); // ₹ per Tonne of CO2
  const [subsidyRate, setSubsidyRate] = useState(70); // % government fertilizer subsidy

  // Dynamic values based on selected field and area
  const area = selectedField.area_acres || 10;
  const stress = selectedField.stress_level;

  // Base calculations
  // Mycelial carbon sequestration yield: healthy soil sequesters more carbon
  const carbonSequestrationPerAcre = stress === 'low' ? 2.4 : stress === 'medium' ? 1.6 : 0.8; // Tonnes/Acre/Year
  const totalCarbonSequestrated = (area * carbonSequestrationPerAcre).toFixed(1);
  const carbonRevenue = Math.round(totalCarbonSequestrated * carbonPrice);

  // Urea savings calculations (Subsidized fertilizer)
  // Standard urea target is ~150 kg/acre. Using biosensors, we reduce chemical waste by 25-40%
  const chemicalUreaReductionKg = Math.round(area * (stress === 'high' ? 65 : stress === 'medium' ? 40 : 15));
  const retailUreaPricePerKg = 6.0; // ₹ retail price
  const subsidizedUreaCostSaved = Math.round(chemicalUreaReductionKg * retailUreaPricePerKg);

  // Government subsidy saved
  // Government pays the remaining cost of urea (usually 70% of import cost)
  // Actual import/production cost of urea is ~₹20/kg, subsidy saves government ₹14/kg
  const actualUreaCostPerKg = 22.0;
  const govSubsidySaved = Math.round(chemicalUreaReductionKg * (actualUreaCostPerKg * (subsidyRate / 100)));

  const netFarmerProfit = carbonRevenue + subsidizedUreaCostSaved;

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Bio-Economic & Carbon Ledger</h2>
        <p className="text-sm text-slate-400">Carbon offset trading indices and state fertilizer subsidy relief ledger.</p>
      </div>

      {/* Intro Pitch */}
      <div className="rounded-xl border border-emerald-500/20 bg-slate-950/60 p-5 backdrop-blur-md flex items-start gap-4">
        <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
          <Leaf className="h-6 w-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Macro-Economic Innovation</h3>
          <p className="text-xs text-slate-450 leading-relaxed">
            By measuring mycelial carbon storage (SOC) and preventing chemical fertilizer waste, our system generates double-sided financial returns: **Farmers** receive carbon credit payouts and reduce crop input costs, while **Governments** offset national net-zero emissions targets and reclaim billions in subsidized fertilizer import margins.
          </p>
        </div>
      </div>

      {/* Control Sliders */}
      <div className="grid gap-4 md:grid-cols-2 bg-slate-900/60 p-4 border border-slate-800 rounded-xl">
        <div className="space-y-2">
          <div className="flex justify-between text-4xs font-bold uppercase">
            <span className="text-slate-400">Carbon Credit Rate (₹/Tonne CO₂e)</span>
            <span className="text-emerald-400 font-mono">₹{carbonPrice.toLocaleString()} / Tonne</span>
          </div>
          <input
            type="range"
            min="800"
            max="2500"
            step="100"
            value={carbonPrice}
            onChange={(e) => setCarbonPrice(parseInt(e.target.value))}
            className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-4xs font-bold uppercase">
            <span className="text-slate-400">Government Fertilizer Subsidy Ratio (%)</span>
            <span className="text-emerald-400 font-mono">{subsidyRate}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="90"
            value={subsidyRate}
            onChange={(e) => setSubsidyRate(parseInt(e.target.value))}
            className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
          />
        </div>
      </div>

      {/* Financial Split Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Farmer Ledger */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-850 pb-3">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="block text-2xs font-bold text-slate-200">FARMER REVENUE & PROFIT</span>
                <span className="text-4xs text-slate-500 font-mono">Sector Target: {selectedField.name} ({area} Ac)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/70 p-3.5 border border-slate-850 rounded">
                <span className="block text-4xs text-slate-500 uppercase font-bold">Carbon Sequestration</span>
                <span className="text-lg font-mono font-bold text-slate-200">{totalCarbonSequestrated} <span className="text-3xs text-slate-500 font-sans">Tonnes</span></span>
                <p className="text-5xs text-slate-500 mt-1">Locked in soil carbon matrix</p>
              </div>

              <div className="bg-slate-950/70 p-3.5 border border-slate-850 rounded">
                <span className="block text-4xs text-slate-500 uppercase font-bold">Carbon Trading Profit</span>
                <span className="text-lg font-mono font-bold text-emerald-400">₹{carbonRevenue.toLocaleString()}</span>
                <p className="text-5xs text-slate-500 mt-1">Payout from verified offset markets</p>
              </div>

              <div className="bg-slate-950/70 p-3.5 border border-slate-850 rounded">
                <span className="block text-4xs text-slate-500 uppercase font-bold">NPK Input Cost Saved</span>
                <span className="text-lg font-mono font-bold text-slate-200">₹{subsidizedUreaCostSaved.toLocaleString()}</span>
                <p className="text-5xs text-slate-500 mt-1">Reduced retail fertilizer cost</p>
              </div>

              <div className="bg-slate-950/70 p-3.5 border border-slate-850 rounded">
                <span className="block text-4xs text-slate-500 uppercase font-bold">Net Profit Increase</span>
                <span className="text-lg font-mono font-bold text-emerald-450">₹{netFarmerProfit.toLocaleString()}</span>
                <p className="text-5xs text-slate-500 mt-1">Total combined farmer return</p>
              </div>
            </div>
          </div>

          <div className="rounded bg-slate-950 p-2.5 text-5xs font-mono text-slate-500 flex gap-2 border border-slate-850">
            <DollarSign className="h-3.5 w-3.5 text-emerald-450 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              *By replacing standard chemical over-irrigation schedules with precise mycelial readings, smallholder farmers increase overall crop yield margins while logging biological offsets.
            </p>
          </div>
        </div>

        {/* Right: Government Treasury Relief */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-850 pb-3">
              <Landmark className="h-5 w-5 text-amber-500" />
              <div>
                <span className="block text-2xs font-bold text-slate-200">GOVERNMENT FINANCIAL SAVINGS</span>
                <span className="text-4xs text-slate-500 font-mono">Macro-Scale Compliance Index</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/70 p-3.5 border border-slate-850 rounded">
                <span className="block text-4xs text-slate-500 uppercase font-bold">Chemical Waste Reduced</span>
                <span className="text-lg font-mono font-bold text-slate-200">{chemicalUreaReductionKg} <span className="text-3xs text-slate-500 font-sans">kg</span></span>
                <p className="text-5xs text-slate-500 mt-1">Excess nitrogen runoff prevented</p>
              </div>

              <div className="bg-slate-950/70 p-3.5 border border-slate-850 rounded">
                <span className="block text-4xs text-slate-500 uppercase font-bold">Subsidy Outlay Reclaimed</span>
                <span className="text-lg font-mono font-bold text-amber-400">₹{govSubsidySaved.toLocaleString()}</span>
                <p className="text-5xs text-slate-500 mt-1">Reclaimed government subsidy funds</p>
              </div>

              <div className="bg-slate-950/70 p-3.5 border border-slate-850 rounded col-span-2">
                <span className="block text-4xs text-slate-500 uppercase font-bold">National Net-Zero contribution</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-mono font-bold text-slate-200">{totalCarbonSequestrated} <span className="text-3xs text-slate-500 font-sans">Tonnes CO₂e</span></span>
                  <span className="text-3xs font-bold text-emerald-400 uppercase font-mono tracking-wider border border-emerald-900/30 px-2 py-0.5 rounded bg-emerald-950/20">
                    PASS ACCREDITATION
                  </span>
                </div>
                <p className="text-5xs text-slate-550 mt-1 leading-relaxed">
                  Contributes directly to state-level environmental offsets under International Carbon Credit Accords.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded bg-slate-950 p-2.5 text-5xs font-mono text-slate-500 flex gap-2 border border-slate-850">
            <Info className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              *Synthetic urea is highly subsidized. By providing sub-ppm precision, the government saves massive budgets directly on retail subsidy outlays while achieving net-zero carbon pledges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
