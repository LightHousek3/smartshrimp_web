import { Image } from 'antd';
import { useState } from 'react';
const productPlaceholder = '/assets/images/logo_smartshrimp.png';

/** Only render the primary image; the other URLs are loaded by Ant Design's preview on demand. */
const ProtocolProductImages = ({ product, size = 32 }) => {
    const [visible, setVisible] = useState(false);
    const urls = product.imageUrls ?? [];
    const thumbnail = (
        <Image
            src={urls[0] || productPlaceholder}
            fallback={productPlaceholder}
            alt={
                urls.length
                    ? `Ảnh ${product.name}`
                    : `Chưa có ảnh ${product.name}`
            }
            width={size}
            height={size}
            preview={urls.length > 0}
            tabIndex={urls.length ? 0 : undefined}
            role={urls.length ? 'button' : undefined}
            aria-label={
                urls.length
                    ? `Xem ${urls.length} ảnh ${product.name}`
                    : undefined
            }
            onKeyDown={(event) => {
                if (urls.length && ['Enter', ' '].includes(event.key)) {
                    event.preventDefault();
                    setVisible(true);
                }
            }}
            className="rounded-sm! object-contain!"
        />
    );
    return urls.length ? (
        <Image.PreviewGroup
            items={urls}
            preview={{ zIndex: 2000, visible, onVisibleChange: setVisible }}
        >
            {thumbnail}
        </Image.PreviewGroup>
    ) : (
        thumbnail
    );
};

export default ProtocolProductImages;
