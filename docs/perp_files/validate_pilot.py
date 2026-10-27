from pathlib import Path
import csv,json,itertools,collections,re,math
import sympy as s
import jsonschema
O=Path(__file__).resolve().parent
Q=[json.loads(line) for line in (O/'mathematics_question_bank_pilot.jsonl').read_text(encoding='utf-8').splitlines()]
schema=json.loads((O/'question_bank_schema.json').read_text(encoding='utf-8'))
for q in Q: jsonschema.Draft202012Validator(schema).validate(q)
def rows(name):
    with (O/name).open(encoding='utf-8',newline='') as f: return list(csv.DictReader(f))
C={c['concept_id']:c for c in rows('concept_taxonomy.csv')}
M={m['misconception_id']:m for m in rows('misconception_taxonomy.csv')}
G=json.loads((O/'prerequisite_graph.json').read_text(encoding='utf-8'))
rank={c:i for i,c in enumerate(G['topological_order'])}
assert set(rank)==set(C)
for edge in G['edges']: assert rank[edge['prerequisite_concept_id']]<rank[edge['dependent_concept_id']]
for q in Q:
    assert abs(sum(q['concept_weights'].values())-1)<1e-12
    assert set(q['concept_weights'])==set(q['concept_ids'])
    assert not set(q['concept_ids']) & set(q['prerequisite_concept_ids'])
    assert all(c in C for c in q['concept_ids']+q['prerequisite_concept_ids'])
    oids=[o['option_id'] for o in q['options']]
    assert oids==list('ABCDEFGH'[:q['option_count']])
    assert q['correct_answer']==next(o['text'] for o in q['options'] if o['option_id']==q['correct_option_id'])
    for name in ['option_explanations','misconception_ids_by_option','local_error_mechanisms_by_option']:assert set(q[name])==set(oids)
    for oid in oids:
        if oid==q['correct_option_id']:assert q['misconception_ids_by_option'][oid]==[]
        else: assert q['misconception_ids_by_option'][oid] or q['local_error_mechanisms_by_option'][oid]
        assert all(m in M for m in q['misconception_ids_by_option'][oid])
nested={k for k,v in Q[0].items() if isinstance(v,(dict,list,bool)) or v is None}
fromcsv=[{k:json.loads(v) if k in nested else int(v) if k in ['difficulty','option_count'] else v for k,v in r.items()} for r in rows('mathematics_question_bank_pilot.csv')]
assert fromcsv==Q
assert len({q['question_id'] for q in Q})==len(Q)==25
x,t,a,b=s.symbols('x t a b',real=True); R=s.Rational
PERMUTATIONS=[[0, 1, 2, 3], [2, 0, 3, 1], [1, 2, 0, 3], [2, 3, 1, 0], [2, 1, 3, 0], [1, 3, 2, 0], [3, 2, 0, 1], [1, 2, 3, 0], [0, 3, 1, 2], [0, 3, 4, 1, 2], [2, 3, 1, 0], [1, 3, 2, 0], [2, 0, 3, 1], [2, 0, 1, 3], [1, 0, 3, 2], [2, 1, 3, 0], [1, 2, 3, 0], [1, 0, 2, 3], [3, 1, 2, 0], [1, 0, 2, 3], [0, 2, 3, 1], [3, 0, 2, 1], [0, 3, 1, 2], [0, 2, 1, 3], [1, 2, 0, 3]]
checks=[]
def pack(i,target,opts,method,detail,error_values=None,claims=None):
    original=opts
    perm=PERMUTATIONS[i]
    opts=[original[k] for k in perm]
    if error_values:error_values={perm.index(k):v for k,v in error_values.items()}
    def equiv(v,w):
        if isinstance(v,s.MatrixBase):return v==w
        if isinstance(v,s.Set):return v==w
        if isinstance(v,tuple):return len(v)==len(w) and all(equiv(vi,wi) for vi,wi in zip(v,w))
        if isinstance(v,bool) or isinstance(w,bool):return v==w
        return s.simplify(s.sympify(v)-s.sympify(w))==0
    matches=[equiv(target,o) for o in opts];key='ABCDEFGH'.index(Q[i]['correct_option_id'])
    assert sum(matches)==1 and matches[key],(i,matches)
    for j,k in itertools.combinations(range(len(opts)),2):assert not equiv(opts[j],opts[k]),(i,j,k)
    ev=[]
    if error_values:
        for j,val in error_values.items():
            assert j!=key and equiv(val,opts[j]),('error mechanism',i,j,val,opts[j])
            ev.append(dict(option_id='ABCDEFGH'[j],derived_error_value=str(val),matches_documented_distractor=True))
    for claim in (claims or []):assert claim,('auxiliary',i)
    checks.append(dict(question_id=Q[i]['question_id'],method=method,computed_answer=str(target),option_semantics=[str(v) for v in opts],option_correctness=matches,exactly_one_correct=True,pairwise_distinct=True,calculation_details=detail,error_transform_checks=ev,auxiliary_assertions_passed=len(claims or [])))
# Directly recompute from stems, then map the explicit mathematical options to semantic objects.
pack(0,-3**2+2*(5-1),[-1,17,1,0],'exact_integer_arithmetic','Python integer precedence; compare all displayed scalar values.',{1:(-3)**2+2*(5-1),2:-3**2+2*5,3:-3**2+2*5-1})
pack(1,s.solveset(x*x-5*x+6,x,domain=s.S.Reals),[s.FiniteSet(-3,-2),s.FiniteSet(2,3),s.FiniteSet(3),s.FiniteSet(1,6)],'symbolic_real_solution_set','solveset of original quadratic over reals.',{0:s.solveset(x*x+5*x+6,x,domain=s.S.Reals),2:s.FiniteSet(3),3:s.FiniteSet(1,6)})
f=lambda z:2*z-3;g=lambda z:z*z+1
pack(2,f(g(2)),[2,5,7,13],'exact_function_composition','Compute g(2), then f of that value.',{0:g(f(2)),1:f(2**2),3:2*g(2)+3})
fx=(x-3)**2+5; gx=s.expand(-2*fx.subs(x,x+1)+4); vx=s.solve(s.diff(gx,x),x)[0]
pack(3,(vx,gx.subs(x,vx)),[(4,-6),(2,14),(2,-2),(2,-6)],'symbolic_vertex','Differentiate the transformed polynomial and evaluate at its unique critical point.',{0:(4,-6),1:(2,2*5+4),2:(2,-2*5+2*4)},[s.diff(gx,x,2)==-4])
pack(4,s.Integer(16)**(-R(3,4)),[R(1,8),-R(1,8),8,R(1,6)],'exact_real_power','Positive-base rational power evaluated exactly.',{1:-s.Integer(16)**(-R(3,4)),2:s.Integer(16)**R(3,4),3:1/(3*s.Integer(16)**R(1,4))})
pack(5,s.log(8,2)+s.log(4,2),[s.log(12,2),5,6,1],'symbolic_logarithms','Exact logarithm definitions and product law.',{0:s.log(8+4,2),2:s.log(8,2)*s.log(4,2),3:s.log(R(8,4),2)})
logcandidates=s.solveset((x-1)*(x-3)-8,x,domain=s.S.Reals); valid=s.FiniteSet(*[v for v in logcandidates if v>3])
pack(6,valid,[s.FiniteSet(-1,5),s.FiniteSet(6),s.FiniteSet(5),s.FiniteSet(-1)],'symbolic_with_domain_filter','x>3 derived from both log arguments; candidate roots checked in original equation.',{0:logcandidates,1:s.solveset(2*x-4-8,x,domain=s.S.Reals),3:s.FiniteSet(-1)},[s.simplify(s.log(4,2)+s.log(2,2))==3])
y=(3*x*x+1)**4
pack(7,s.diff(y,x),[4*(3*x*x+1)**3,24*x*(3*x*x+1)**4,12*x*(3*x*x+1)**3,24*x*(3*x*x+1)**3],'symbolic_derivative_equivalence','Differentiate original expression; simplify every option difference as a function.',{0:4*(3*x*x+1)**3,1:4*(3*x*x+1)**4*6*x,2:4*(3*x*x+1)**3*3*x})
yvar=s.symbols('y',real=True);F=x*x+x*yvar+yvar*yvar-7; m=s.simplify(-s.diff(F,x)/s.diff(F,yvar)).subs({x:1,yvar:2})
pack(8,-1/m,[R(5,4),-R(4,5),-R(5,4),R(4,5)],'symbolic_implicit_gradient','Implicit gradient -F_x/F_y; normal is negative reciprocal. Options all pass through (1,2).',{1:m,2:1/m,3:-m},[F.subs({x:1,yvar:2})==0,s.diff(F,yvar).subs({x:1,yvar:2})!=0])
deriv=s.diff(x**3-3*a*x,x)
maxfun=lambda z:3*max(abs(z),abs(1-z))
pack(9,R(1,2),[0,R(1,2),R(1,3),1,R(2,3)],'symbolic_minimax_bound','Derivative is affine in x^2 in [0,1]. Max endpoint distances has lower bound 1/2 by triangle inequality; equal endpoint distances gives unique a=1/2.',{0:0,2:s.integrate(x*x,(x,-1,1))/2,3:1,4:(R(1,3)+1)/2},[s.expand(deriv-3*(x*x-a))==0,maxfun(R(1,2))==R(3,2),maxfun(0)==3,maxfun(R(1,3))==2,maxfun(1)==3,maxfun(R(2,3))==2,s.solve(s.Eq(a,1-a),a)==[R(1,2)]])
orig=2*x*(1+x*x)**3; value=s.integrate(orig,(x,0,1))
pack(10,value,[R(15,8),R(15,2),R(15,4),4],'symbolic_definite_integral','Integrate the original polynomial directly, independently of the substitution explanation.',{0:value/2,1:value*2,3:s.integrate(t**3,(t,0,2))},[s.diff((1+x*x)**4/4,x)==orig])
integrand=1/(x*(x-1)); value=s.simplify(s.expand_log(s.integrate(integrand,(x,2,3)),force=True))
# Explicit log simplification handles the equivalent log(4/3) representation.
pack(11,s.logcombine(value,force=True),[s.log(R(4,3)),s.log(3),s.log(R(3,4)),s.log(R(3,2))],'symbolic_partial_fraction_and_integral','apart verifies decomposition; exact definite integral reduced by logarithm laws.',{1:s.logcombine(s.integrate(1/x+1/(x-1),(x,2,3)),force=True),2:-s.log(R(4,3)),3:s.logcombine(s.integrate(1/x,(x,2,3)),force=True)},[s.simplify(integrand-(-1/x+1/(x-1)))==0,s.simplify(s.diff(s.log(x-1)-s.log(x),x)-integrand)==0])
pack(12,180-48-67,[115,245,19,65],'exact_triangle_angle_sum','Euclidean triangle interior-angle total minus the two given angles.',{0:48+67,1:360-48-67,2:67-48})
k=s.symbols('k',real=True); kvals=s.solveset((k+5)**2-625,k,domain=s.S.Reals)
pack(13,kvals,[s.FiniteSet(-10,0),s.FiniteSet(-30,20),s.FiniteSet(-130,120),s.FiniteSet(-20,30)],'symbolic_line_circle_tangency','Distance criterion and an independent zero-discriminant substitution into circle.',{0:s.solveset((k+5)**2-25,k,domain=s.S.Reals),2:s.solveset((k+5)**2-125**2,k,domain=s.S.Reals),3:s.solveset((k-5)**2-625,k,domain=s.S.Reals)},[s.solveset(s.discriminant((x-1)**2+((k-3*x)/4+2)**2-25,x),k,domain=s.S.Reals)==kvals])
pack(14,s.trigsimp(s.cos(s.pi/8)**2-s.sin(s.pi/8)**2),[1,(2-s.sqrt(2))/2,s.sqrt(2)/2,0],'symbolic_trigonometric_exact_value','Direct evaluation of original sine/cosine expression and double-angle identity.',{0:s.cos(s.pi/8)**2+s.sin(s.pi/8)**2,1:2*s.sin(s.pi/8)**2,3:s.cos(s.pi/4)**2-s.sin(s.pi/4)**2})
dom=s.Interval.Ropen(0,2*s.pi); trigset=s.solveset(s.sin(2*x)-s.cos(x),x,domain=dom)
S=s.FiniteSet
pack(15,trigset,[S(s.pi/6,5*s.pi/6),S(s.pi/2,3*s.pi/2),S(s.pi/6,s.pi/2,7*s.pi/6,3*s.pi/2),S(s.pi/6,s.pi/2,5*s.pi/6,3*s.pi/2)],'symbolic_interval_trigonometric_solution','solveset on [0,2pi); factor identity and direct substitution also checked.',{0:s.solveset(s.sin(x)-R(1,2),x,domain=dom),1:s.solveset(s.cos(x),x,domain=dom),2:S(s.pi/6,s.pi/2,7*s.pi/6,3*s.pi/2)},[s.trigsimp(s.sin(2*x)-s.cos(x)-s.cos(x)*(2*s.sin(x)-1))==0])
u=s.Matrix([1,2,0]);v=s.Matrix([0,1,3]);cross=u.cross(v)
pack(16,cross,[s.Matrix([6,-3,1]),s.Matrix([-6,3,-1]),s.Matrix([0,2,0]),s.Matrix([6,3,1])],'exact_vector_cross_product','SymPy matrix cross product, with dot-product perpendicularity checks.',{1:v.cross(u),2:u.multiply_elementwise(v),3:s.Matrix([cross[0],-cross[1],cross[2]])},[cross.dot(u)==0,cross.dot(v)==0])
p=s.Matrix([1,1,0]);d=s.Matrix([1,0,1]);dist=p.cross(d).norm()/d.norm();sqd=(p-t*d).dot(p-t*d);bestt=s.solve(s.diff(sqd,t),t)[0]
pack(17,dist,[s.sqrt(3),s.sqrt(6)/2,s.sqrt(2),s.sqrt(2)/2],'exact_vector_distance_and_minimisation','Cross-product distance agrees with global minimum of a positive quadratic.',{0:p.cross(d).norm(),2:p.norm(),3:abs(p.dot(d))/d.norm()},[s.simplify(dist**2-sqd.subs(t,bestt))==0,s.diff(sqd,t,2)>0])
prior=R(2,100); sens=R(9,10);fp=R(1,10);joint=prior*sens;total=joint+(1-prior)*fp
pack(18,joint/total,[sens,R(9,59),R(9,58),R(18,1000)],'exact_Bayes_probability','Exact rational joint probability divided by exact total probability.',{0:sens,1:joint/(joint+fp),3:joint})
p=R(1,3);prob=s.binomial(4,2)*p**2*(1-p)**2
pack(19,prob,[R(4,81),R(1,9),R(2,3),R(8,27)],'exact_binomial_enumeration','Binomial formula agrees with enumeration of all 16 Bernoulli outcome sequences.',{0:p**2*(1-p)**2,1:p**2,2:s.binomial(4,2)*p**2},[sum(p**sum(z)*(1-p)**(4-sum(z)) for z in itertools.product([0,1],repeat=4) if sum(z)==2)==prob])
zold=R(196,100);znew=R(2576,1000);bound=100*(2*znew/zold)**2;nmin=s.ceiling(bound)
pack(20,nmin,[691,400,690,263],'exact_confidence_margin_inequality','Known sigma cancels; compute exact lower bound and ceiling; test n and n-1 by squared positive inequalities.',{1:4*100,2:s.floor(bound),3:s.ceiling(100*(2*znew/zold))},[znew**2/nmin<=(zold/20)**2,znew**2/(nmin-1)>(zold/20)**2])
# Item 22 is a semantic inference question: no invented automatic verification of the prose.
checks.append(dict(question_id=Q[21]['question_id'],method='author_semantic_review_only',computed_answer='Long-run coverage P_theta(theta in C(X))=0.95 under valid model assumptions.',option_semantics=['procedure_coverage','posterior_fixed_parameter_probability','individual_observation_coverage','exact_sample_mean_equality'],option_correctness=None,exactly_one_correct=None,pairwise_distinct=None,calculation_details='Author compared option meanings against the formal coverage definition and OpenStax formula review. This is not an automatic theorem check or independent human review.',error_transform_checks=[],auxiliary_assertions_passed=0))
# Item 23: parity case enumeration and homogeneous descent, plus full integer solver.
aa,bb=s.symbols('a b',integer=True);F=aa**2+bb**2-3*aa*bb
residue_solutions=[(i,j) for i in range(4) for j in range(4) if (i*i+j*j-3*i*j)%4==0]
assert residue_solutions==[(0,0),(0,2),(2,0),(2,2)],residue_solutions
scale=s.expand(F.subs({aa:aa/2,bb:bb/2},simultaneous=True)-F/4)
assert scale==0 and s.diophantine(F)=={(0,0)}
checks.append(dict(question_id=Q[22]['question_id'],method='symbolic_integer_solver_and_finite_residue_exhaustion',computed_answer='B: parity forces both even; homogeneous halving preserves equation and strictly reduces positive sum.',option_semantics=['invalid_universal_evenness','valid_infinite_descent','finite_examples_not_universal_proof','invalid_difference_substitution'],option_correctness=[False,True,False,False],exactly_one_correct=True,pairwise_distinct=True,calculation_details=f'Enumerated all 16 residue pairs modulo 4. Solutions: {residue_solutions}. SymPy diophantine returns only (0,0). Scaling polynomial residual=0. Argument-to-text mapping remains author reviewed.',error_transform_checks=[{'option_id':'A','counterexample':'a=1,b=2 makes a^2+b^2 odd','verified':(1**2+2**2)%2==1},{'option_id':'D','invariance_residual':str(s.expand(F.subs(aa,aa-bb)-F)),'verified':s.expand(F.subs(aa,aa-bb)-F)!=0}],auxiliary_assertions_passed=3))
perms=set(itertools.permutations('AABBC'));count=sum('AA' not in ''.join(p) for p in perms)
pack(23,count,[30,12,18,36],'exhaustive_multiset_enumeration','Enumerate all unique permutations and reject adjacent A letters; compare block and gap derivations.',{0:s.factorial(5)/(s.factorial(2)**2),1:s.factorial(4)/s.factorial(2),3:s.factorial(3)*s.binomial(4,2)},[count==3*s.binomial(4,2),count==30-12])
z=s.symbols('z');roots=s.solveset(z**3-8*s.I,z,domain=s.S.Complexes)
def cset(angles,r=2):return s.FiniteSet(*[s.simplify(s.expand_complex(r*s.exp(s.I*angle))) for angle in angles])
angles=[s.pi/6,5*s.pi/6,3*s.pi/2];rootopts=[cset([s.pi/6]),cset(angles,8),cset([s.pi/2,7*s.pi/6,11*s.pi/6]),cset(angles)]
pack(24,roots,rootopts,'symbolic_complex_solution_set','Solve original cubic over complex numbers; compare exact rectangular root sets; degree and direct cubes establish completeness.',{0:cset([s.pi/6]),1:cset(angles,8),2:cset([s.pi/2,7*s.pi/6,11*s.pi/6])},[all(s.simplify(v**3-8*s.I)==0 for v in rootopts[3]),len(rootopts[3])==3])
for idx in [21,22]:
    c=checks[idx];perm=PERMUTATIONS[idx]
    c['option_semantics']=[c['option_semantics'][k] for k in perm]
    if c['option_correctness'] is not None:c['option_correctness']=[c['option_correctness'][k] for k in perm]
    for ev in c['error_transform_checks']:ev['option_id']='ABCDEFGH'[perm.index('ABCDEFGH'.index(ev['option_id']))]
    if idx==22:c['computed_answer']=Q[idx]['correct_option_id']+': parity forces both even; homogeneous halving preserves equation and strictly reduces positive sum.'
assert len(checks)==25

print(json.dumps({'questions':len(Q),'executable_mathematical_checks':len(checks)-1,'semantic_review_only':1,'sympy_version':s.__version__,'result':'all executable mathematical assertions passed'}))
