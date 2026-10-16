import companyMark from '../../assets/kazatomprom-mark.png'

/** Decorative beside the product name; retain the supplied company's original artwork. */
export function BrandMark() {
  return <img className="brand__mark" src={companyMark} alt="" width={34} height={34} />
}
