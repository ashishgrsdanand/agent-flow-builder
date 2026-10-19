import type { Plan, PlanWorker } from '../types';

/* ---- the graph explained in plain English ---- */
export function explainGraph(plan: Plan | null): string[] {
  if (!plan) return ['Add some agents to the canvas and your graph will be explained here.'];
  const W = plan.workers, ws = Object.values(W);
  const nm = (id: string): string => W[id] ? W[id].name : (plan.sup && plan.sup.id === id ? plan.sup.name : id);
  const list = (a: string[]): string => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const branchText = (w: PlanWorker): string => 'After ' + w.name + ' finishes, the model picks one path: ' + w.branches.map(b => nm(b.to) + ' (' + (b.when ? 'when ' + b.when : 'otherwise') + ')').join('; ') +
    (w.hasDefault ? '' : '; or DONE, which ' + (plan.done === 'supervisor' ? 'returns to the Supervisor' : 'ends the run')) + '.';
  const out: string[] = [];
  if (plan.sup) {
    out.push('A run starts at START and goes straight to the Supervisor.');
    out.push(plan.routes.length ? 'The Supervisor asks the model which agent should act next. It can choose ' + list(plan.routes.map(r => nm(r.to))) + ', or FINISH when the request is done.' : 'The Supervisor has no agents to choose from yet. Connect it to some agents.');
    plan.routes.filter(r => r.when).forEach(r => out.push('Routing hint: ' + nm(r.to) + ' is chosen only when ' + r.when + '.'));
    const back = ws.filter(w => w.mode === 'back');
    if (back.length) out.push(list(back.map(w => w.name)) + (back.length > 1 ? ' report' : ' reports') + ' back to the Supervisor when ' + (back.length > 1 ? 'they finish' : 'it finishes') + ', so the Supervisor can pick the next step.');
    ws.filter(w => w.mode === 'chain').forEach(w => out.push(w.name + ' always hands off to ' + list(w.next.map(x => nm(x.to))) + ' when it finishes.' + (w.next.length > 1 ? ' They run at the same time.' : '')));
    ws.filter(w => w.mode === 'router').forEach(w => out.push(branchText(w)));
    out.push('When the Supervisor answers FINISH, the run goes to END and you get the whole conversation back.');
    out.push('Cost tip: every agent turn uses two model calls, one for the Supervisor deciding and one for the agent itself.');
  } else if (ws.length) {
    out.push('A run starts at START and goes to ' + list(plan.entries.map(nm)) + '.' + (plan.entries.length > 1 ? ' They start at the same time.' : ''));
    ws.forEach(w => {
      if (w.mode === 'router') out.push(branchText(w));
      else if (w.mode === 'chain') out.push(w.name + ' is followed by ' + list(w.next.map(x => nm(x.to))) + '.');
      else out.push(w.name + ' is a last step, so the run ends after it.');
    });
    out.push('There is no Supervisor, so the order is fixed by your arrows. Add a Supervisor if you want a model to decide the order.');
  }
  return out;
}
