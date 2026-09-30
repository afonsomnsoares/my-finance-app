import SkeletonCard from '../../components/SkeletonCard';

export default function InvestmentsSkeleton() {
  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <SkeletonCard height={48} style={{ borderRadius: 10, marginBottom: '1.5rem' }} />
      <div className="row g-3 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="col-6 col-md-3">
            <SkeletonCard height={100} style={{ borderRadius: 12 }} />
          </div>
        ))}
      </div>
      <div className="row g-4 mb-4">
        <div className="col-lg-4"><SkeletonCard height={300} style={{ borderRadius: 12 }} /></div>
        <div className="col-lg-8"><SkeletonCard height={300} style={{ borderRadius: 12 }} /></div>
      </div>
      <div className="row g-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="col-sm-6 col-md-4"><SkeletonCard height={200} style={{ borderRadius: 12 }} /></div>
        ))}
      </div>
    </div>
  );
}
