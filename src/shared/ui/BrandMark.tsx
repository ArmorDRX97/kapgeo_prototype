import companyMaster from '../../assets/kazatomprom-master.png'

/** Original supplied master artwork; the viewBox displays its symbol without distortion. */
export function BrandMark() {
  return <svg className="brand__mark" viewBox="280 0 378 334" width={34} height={34} aria-hidden="true"><image href={companyMaster} width={938} height={562} /></svg>
}
