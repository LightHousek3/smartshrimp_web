import { App, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../apis';
import { getNotificationDestination, getNotificationTargets } from '../utils/notificationUtils';

/** Share navigation between the inbox, its detail drawer and the notification bell. */
export const useNotificationNavigation = () => {
    const navigate = useNavigate();
    const { modal, message } = App.useApp();

    return async (notification) => {
        const destination = getNotificationDestination(notification);
        if (!destination) return false;
        const context = destination.needsContext
            ? await notificationAPI.getReferenceContext(notification.id)
            : {};
        const targets = getNotificationTargets(notification, context);
        if (!targets.length) {
            message.warning('Nội dung liên quan không còn khả dụng hoặc bạn không còn được phân công.');
            return false;
        }
        if (targets.length === 1) {
            navigate(targets[0].path);
        } else {
            const dialog = modal.info({
                title: 'Chọn phần liên quan cần xem',
                width: 540,
                okText: 'Đóng',
                content: (
                    <div className="mt-3 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
                        {targets.map((target) => (
                            <Button
                                key={target.path}
                                className="h-auto! whitespace-normal! py-3! text-left!"
                                block
                                onClick={() => {
                                    dialog.destroy();
                                    navigate(target.path);
                                }}
                            >
                                <span className="block w-full">
                                    <span className="block font-semibold">{target.label}</span>
                                    <span className="block text-xs text-[#6a7994]">{target.description}</span>
                                </span>
                            </Button>
                        ))}
                    </div>
                ),
            });
        }
        return true;
    };
};
