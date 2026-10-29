import { useRef } from 'react';
import { InputNumber } from 'antd';

const NumberDraft = ({
    value,
    onChange,
    onBlur,
    onKeyDown,
    formatter,
    parser,
    precision,
    ...props
}) => {
    const draft = useRef(value);
    const commit = () => {
        const number =
            Number.isFinite(draft.current) && Number.isInteger(precision)
                ? Number(draft.current.toFixed(precision))
                : draft.current;
        if (!Object.is(number, value)) onChange?.(number);
    };
    return (
        <InputNumber
            {...props}
            defaultValue={value}
            precision={precision}
            parser={parser}
            formatter={
                formatter ??
                ((number, { userTyping, input }) =>
                    userTyping
                        ? input
                        : number == null || number === ''
                          ? ''
                          : String(Number(number)))
            }
            onChange={(number) => {
                draft.current = number;
            }}
            onInput={(text) => {
                const parsed = parser ? parser(text) : text;
                draft.current =
                    String(parsed ?? '').trim() &&
                    Number.isFinite(Number(parsed))
                        ? Number(parsed)
                        : null;
            }}
            onBlur={(event) => {
                // Commit once when focus leaves the field; typing must not rerender the entire protocol.
                commit();
                onBlur?.(event);
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter') commit();
                onKeyDown?.(event);
            }}
        />
    );
};

/** Remount only this draft when its saved value changes after reload, conversion or a committed edit. */
const ProtocolNumberInput = (props) => (
    <NumberDraft key={String(props.value ?? '')} {...props} />
);

export default ProtocolNumberInput;
