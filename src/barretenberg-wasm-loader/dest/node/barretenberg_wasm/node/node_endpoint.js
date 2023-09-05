export function nodeEndpoint(nep) {
    const listeners = new WeakMap();
    return {
        postMessage: nep.postMessage.bind(nep),
        addEventListener: (_, eh) => {
            const l = (data) => {
                if ('handleEvent' in eh) {
                    eh.handleEvent({ data });
                }
                else {
                    eh({ data });
                }
            };
            nep.on('message', l);
            listeners.set(eh, l);
        },
        removeEventListener: (_, eh) => {
            const l = listeners.get(eh);
            if (!l) {
                return;
            }
            nep.off('message', l);
            listeners.delete(eh);
        },
        start: nep.start && nep.start.bind(nep),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9lbmRwb2ludC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9iYXJyZXRlbmJlcmdfd2FzbS9ub2RlL25vZGVfZW5kcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFpQjtJQUM1QyxNQUFNLFNBQVMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ2hDLE9BQU87UUFDTCxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3RDLGdCQUFnQixFQUFFLENBQUMsQ0FBTSxFQUFFLEVBQU8sRUFBRSxFQUFFO1lBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBUyxFQUFFLEVBQUU7Z0JBQ3RCLElBQUksYUFBYSxJQUFJLEVBQUUsRUFBRTtvQkFDdkIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7aUJBQzFCO3FCQUFNO29CQUNMLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7aUJBQ2Q7WUFDSCxDQUFDLENBQUM7WUFDRixHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyQixTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QixDQUFDO1FBQ0QsbUJBQW1CLEVBQUUsQ0FBQyxDQUFNLEVBQUUsRUFBTyxFQUFFLEVBQUU7WUFDdkMsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QixJQUFJLENBQUMsQ0FBQyxFQUFFO2dCQUNOLE9BQU87YUFDUjtZQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUNELEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztLQUN4QyxDQUFDO0FBQ0osQ0FBQyJ9