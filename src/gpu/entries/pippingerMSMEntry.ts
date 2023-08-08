import { ExtPointType } from "@noble/curves/abstract/edwards";
import { FieldMath } from "../../utils/FieldMath";

const initialize_bucket = (): Map<number, ExtPointType> => {
    const fieldMath = new FieldMath();
    const T = new Map();
    for (let i = 0; i < 2**16; i++) {
        T.set(i, fieldMath.customEdwards.ExtendedPoint.ZERO);
    }
    return T;
}

export const pippinger_msm = async (points: ExtPointType[], scalars: number[]) => {
    console.log("Pippinger MSM function running...");
    console.log("Points: ");
    console.log(points);
    console.log("Scalars: ")
    console.log(scalars);

    // Need to initialize 16 MSMs (T1, T2, ..., T16)
    const msms = [];
    for (let i = 0; i < 16; i++) {
        msms.push(initialize_bucket());
    }

    console.log("16 MSMs: ")
    console.log(msms);

    let scalar_index = 0;
    let points_index = 0;
    while (points_index < points.length) {
        console.log(`points_index = ${points_index}`);
        console.log(`scalar_index = ${scalar_index}`);
        
        const scalar = scalars[scalar_index];
        console.log("Scalar: ");
        console.log(scalar);
        
        const point_to_add = points[points_index];
        console.log("Point to add: ");
        console.log(point_to_add);

        const msm_index = scalar_index % 16;
        //console.log(`msm_index = ${msm_index}`);
        
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const current_point = msms[msm_index].get(scalar)!;
        console.log("Current point: ")
        console.log(current_point);

        console.log(current_point.add(point_to_add));

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        //msms[msm_index].set(scalar, point_to_add.add(current_point!));
        scalar_index += 1;
        if (scalar_index % 16 == 0) {
            points_index += 1;
        }
    }

    console.log(msms);

    return new Uint32Array();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).pippinger_msm = pippinger_msm;