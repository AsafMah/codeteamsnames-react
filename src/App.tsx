import React, {
    FunctionComponent,
    SyntheticEvent,
    useEffect,
    useState
} from 'react';

import {Chance} from 'chance';

interface User {
    name: string;
    smPool: boolean;
    enabled: boolean;
    id: string;
    isSm?: boolean;
}

type OnChange<T> = { onChange: (item: T) => void };
type WithOnChange<T> = T & OnChange<T>;


const App: FunctionComponent = () => {
    const [names, setNames] = useState<string[]>(nameList);
    const [users, setUsers] = useState<Map<string, User>>(new Map());
    const [teamCount, setTeamCount] = useState(2);
    const [bias, setBias] = useState("red");
    const colors = ["red", "blue", "green", "yellow"];

    useEffect(() => {
        setUsers(oldUsers => {
            const newUsers: Map<string, User> = new Map();
            for (const n of names) {
                if (!n?.trim()) {
                    continue;
                }
                newUsers.set(n, oldUsers.get(n) ?? {name: n, smPool: true, enabled: false, id: Chance().guid()});
            }
            return newUsers;
        });
    }, [names]);

    return (
        <div className="font-normal container mx-auto px-40">
            <div className="flex flex-wrap justify-center"> {[...users.values()].map(user => (
                <Member key={user.name} {...user} onChange={u => {
                    const newMap = new Map(users);
                    newMap.set(user.name, u);
                    setUsers(newMap);
                }}/>
            ))
            }
            </div>
            <div className="mx-auto flex flex-wrap">
                <div className="px-4">
                    <Names names={names} onChange={setNames}/>
                </div>
                <div>
                    <div className="inline-block text-xl"><label htmlFor="teamCount">Team
                        Count: </label>
                        <input className="border border-black" name="teamCount" type="number"
                               min={2} max={colors.length} value={teamCount} onChange={e => {
                            let number = +e.target.value;
                            if (number < 2) {
                                number = 2;
                            }
                            if (number > colors.length) {
                                number = colors.length;
                            }

                            setTeamCount(number);
                        }}/></div>
                    <div
                        className="flex"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBias(e.target.value)}>
                        {[...colors.slice(0, teamCount), "random"].map(c => <div
                            className="capitalize inline-block px-3" key={c}><input
                            type="radio" value={c} defaultChecked={c === bias}
                            name="bias"/> {c} </div>)}
                    </div>
                    <button
                        className="text-2xl font-medium rounded-md p-2 m-4 bg-blue-500 text-white"
                        onClick={_ => setUsers(new Map(users))}>Reshuffle Teams
                    </button>
                    <Teams users={[...users.values()]} teamCount={teamCount} colors={colors}
                           bias={bias}/>
                </div>
            </div>
        </div>
    );
};

const Member: FunctionComponent<WithOnChange<User>> = ({name, smPool, enabled, id, onChange}) => {
    const setSmPool = (smPool: boolean) => onChange({name, enabled, smPool,id});
    const setEnabled = (enabled: boolean) => onChange({name, enabled, smPool, id});
    const overallColor = enabled ? "green" : "gray";
    const canBeSmColor = enabled && smPool ? "green" : "gray";
    const smHover = enabled ? `bg-${canBeSmColor}-300 hover:bg-${canBeSmColor}-400` : "";

    let onSmClick = (e: SyntheticEvent) => {
        e.stopPropagation();
        if (!enabled) {
            setEnabled(true);
            return;
        }
        setSmPool(!smPool)
    };
    return (
        <div
            className={`text-xl p-3 m-3 bg-${overallColor}-300 hover:bg-${overallColor}-400 rounded-md items-center cursor-pointer`}
            onClick={() => setEnabled(!enabled)}>
            <button
                className=" font-medium rounded-md p-2 bg-blue-500 text-white">{name}</button>
            <div className={`block border-4 ${smHover} cursor-pointer`}
                 onClick={onSmClick}>
                <input type="checkbox" className="cursor-pointer" name="SM Pool" id={name}
                       defaultChecked={smPool}
                       onClick={onSmClick}/>
                <label className="cursor-pointer" htmlFor="SM Pool"> Can Be SM</label></div>
        </div>
    );
};

const Names: FunctionComponent<{ names: string[], onChange: (names: string[]) => void }>
    = ({names, onChange}) => (
    <textarea className="border-2 border-gray-500" name="names" id="names" cols={30} rows={20}
              onChange={e => onChange(e.target.value.split("\n"))} value={names.join("\n")}/>
);

const Teams: FunctionComponent<{ users: User[], teamCount: number, colors: string[], bias: string }> = ({
                                                                                                            users,
                                                                                                            teamCount,
                                                                                                            colors,
                                                                                                            bias
                                                                                                        }) => {
    const [seed, setSeed] = useState(0);
    const [random, setRandom] = useState(Chance());
    const [sortedUsers, setSortedUsers] = useState<User[][]>([]);
    useEffect(() => setSeed(Chance().integer()), [users]);
    useEffect(() => setRandom(Chance(seed)), [seed]);

    useEffect(() => {
        const shuffledUsers = random.shuffle(users.filter(u => u.enabled));
        if (!shuffledUsers) {
            return;
        }
        const smToFront = shuffledUsers.sort((a, b) => a.smPool ? -1 : (b.smPool ? 1 : 0));
        const finalArr: User[][] = [];

        for (let i = 0; i < smToFront.length / teamCount; i++) {
            finalArr.push([]);
            for (let j = 0; j < teamCount; j++) {
                let user = smToFront[i * teamCount + j] ?? {
                    name: "",
                    enabled: false,
                    smPool: false,
                    id: Chance().guid()
                };
                finalArr[i].push(user);
                finalArr[i][j].isSm = i === 0 && user.smPool;
            }
        }
        let biasIndex = colors.slice(0, teamCount).findIndex(x => x === bias);
        if (biasIndex === -1) {
            biasIndex = Chance().integer({min: 0, max: teamCount - 1});
        }
        let finalRow = finalArr.length - 1;
        if (finalArr[finalRow])
        {
            if (!finalArr[finalRow][biasIndex].enabled){
                let firstNamedIndex = finalArr[finalRow].findIndex(n => n.enabled);
                if (firstNamedIndex !== -1) {
                    const temp = finalArr[finalRow][biasIndex];
                    finalArr[finalRow][biasIndex] = finalArr[finalRow][firstNamedIndex]
                    finalArr[finalRow][firstNamedIndex] = temp;
                }
            }
        }

        setSortedUsers(finalArr);
    }, [random, teamCount, bias, colors, users]);

    return <table className="table-fixed p-3 text-2xl text-center flex-auto">
        <thead>
        <tr>
            {colors.slice(0, teamCount).map(c =>
                <th key={c} className={`p-2 capitalize bg-${c}-400`}>{c + " Team"}</th>
            )
            }
        </tr>
        </thead>
        <tbody>
        {sortedUsers.map((row) => <tr key={row.map(c => c.id).join()}>
            {row.map((u, i) =>
                <td className={`p-3 border bg-${colors[i]}-200 ${u.isSm ? "font-bold" : ""}`}
                    key={u.id}>
                    {u.name + (u.isSm ? " - Spy Master" : "")}
                </td>
            )}
        </tr>)}
        </tbody>
    </table>
};


export default App;


const nameList = [
    "AmitSh",
    "Ariel",
    "Asaf",
    "Boaz",
    "Keren",
    "Lea",
    "Nir",
    "Ohad",
    "Ran",
    "Vladik",
    "Yihezkel",
    "Yochai",
]